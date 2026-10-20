import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, Switch, Image, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { C } from '../../lib/theme';

const IMAGE_BUCKET = 'pharmacy-product-images';

interface ProductImage {
  key: string;
  url: string;
  id?: string;
  storagePath?: string | null;
  base64?: string;
  contentType?: string;
}

function getImageExtension(contentType: string) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [stock, setStock] = useState('0');
  const [requiresAge, setRequiresAge] = useState(false);
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [originalImages, setOriginalImages] = useState<ProductImage[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isEditing) void fetchProduct();
  }, [id]);

  async function fetchProduct() {
    setFetching(true);
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) {
      Alert.alert('Error al cargar producto', error.message);
      setFetching(false);
      return;
    }
    if (data) {
      setName(data.name);
      setDescription(data.description || '');
      setPrice(String(data.price));
      setCostPrice(String(data.cost_price || ''));
      setBarcode(data.barcode || '');
      setStock(String(data.stock));
      setRequiresAge(data.requires_age_verification);
      setRequiresPrescription(!!data.requires_prescription);

      const { data: gallery, error: galleryError } = await supabase
        .from('product_images')
        .select('id, image_url, storage_path')
        .eq('product_id', id)
        .order('sort_order');
      if (galleryError) {
        Alert.alert('Error al cargar imágenes', galleryError.message);
      } else {
        const loaded: ProductImage[] = (gallery ?? []).map((image) => ({
          key: image.id,
          id: image.id,
          url: image.image_url,
          storagePath: image.storage_path,
        }));
        if (loaded.length === 0 && data.image_url) {
          loaded.push({ key: data.image_url, url: data.image_url });
        }
        setImages(loaded);
        setOriginalImages(loaded);
      }
    }
    setFetching(false);
  }

  function addImageUrl() {
    const url = imageUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      Alert.alert('Enlace inválido', 'Ingresa una URL completa que comience con https:// o http://.');
      return;
    }
    if (images.some((image) => image.url === url)) {
      Alert.alert('Imagen duplicada', 'Este enlace ya está agregado al producto.');
      return;
    }
    setImages((current) => [...current, { key: `url-${Date.now()}`, url }]);
    setImageUrl('');
  }

  async function addPickedImages(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso de cámara', 'Permite el acceso a la cámara para tomar una foto del producto.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso de fotos', 'Permite el acceso a tus fotos para seleccionar imágenes del producto.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.78,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.78,
            base64: true,
            selectionLimit: 8,
          });

      if (result.canceled) return;
      const selected = result.assets.flatMap((asset, index) => {
        if (!asset.base64) return [];
        const contentType = asset.mimeType || 'image/jpeg';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return [];
        return [{
          key: `local-${Date.now()}-${index}`,
          url: asset.uri,
          base64: asset.base64,
          contentType,
        }];
      });
      if (selected.length === 0) {
        Alert.alert('No se pudieron cargar las fotos', 'Vuelve a seleccionar imágenes JPEG, PNG o WebP.');
        return;
      }
      setImages((current) => [...current, ...selected].slice(0, 12));
    } catch (error) {
      Alert.alert('Error al seleccionar imágenes', error instanceof Error ? error.message : 'No fue posible abrir la cámara o galería.');
    }
  }

  async function saveImages(productId: string) {
    const uploaded: ProductImage[] = [];
    for (const image of images) {
      if (!image.base64 || !image.contentType) {
        uploaded.push(image);
        continue;
      }

      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${getImageExtension(image.contentType)}`;
      const bytes = Uint8Array.from(atob(image.base64), (character) => character.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, bytes, { contentType: image.contentType, upsert: false });
      if (uploadError) {
        if (uploaded.some((entry) => entry.storagePath)) {
          const paths = uploaded.flatMap((entry) => entry.storagePath ? [entry.storagePath] : []);
          await supabase.storage.from(IMAGE_BUCKET).remove(paths);
        }
        throw new Error(`No se pudo subir una foto: ${uploadError.message}`);
      }
      const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
      uploaded.push({ ...image, url: data.publicUrl, storagePath: path, base64: undefined });
    }

    const removed = originalImages.filter((image) => image.id && !images.some((current) => current.id === image.id));
    if (removed.length) {
      const { error } = await supabase.from('product_images').delete().in('id', removed.flatMap((image) => image.id ? [image.id] : []));
      if (error) throw new Error(`No se pudieron quitar imágenes anteriores: ${error.message}`);
      const paths = removed.flatMap((image) => image.storagePath ? [image.storagePath] : []);
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
        if (storageError) throw new Error(`Se quitaron de la galería, pero no del almacenamiento: ${storageError.message}`);
      }
    }

    for (let index = 0; index < uploaded.length; index += 1) {
      const image = uploaded[index];
      if (image.id) {
        const { error } = await supabase.from('product_images')
          .update({ sort_order: index })
          .eq('id', image.id);
        if (error) throw new Error(`No se pudo ordenar la galería: ${error.message}`);
      } else {
        const { error } = await supabase.from('product_images').insert({
          product_id: productId,
          image_url: image.url,
          storage_path: image.storagePath ?? null,
          sort_order: index,
        });
        if (error) throw new Error(`No se pudo guardar la galería: ${error.message}`);
      }
    }

    const { error: primaryImageError } = await supabase
      .from('products')
      .update({ image_url: uploaded[0]?.url ?? null })
      .eq('id', productId);
    if (primaryImageError) throw new Error(`No se pudo actualizar la imagen principal: ${primaryImageError.message}`);
  }

  async function handleSave() {
    const numericPrice = Number(price);
    if (!name.trim() || !price.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert('Datos incompletos', 'Ingresa un nombre y un precio válido mayor que cero.');
      return;
    }
    if (images.length > 12) {
      Alert.alert('Límite de imágenes', 'Cada producto puede tener hasta 12 imágenes.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: numericPrice,
        cost_price: costPrice ? Number(costPrice) : null,
        barcode: barcode.trim() || null,
        stock: Math.max(0, parseInt(stock, 10) || 0),
        requires_age_verification: requiresAge,
        requires_prescription: requiresPrescription,
        updated_by: session?.user?.id,
        ...(isEditing ? {} : { created_by: session?.user?.id }),
      };

      const result = isEditing
        ? await supabase.from('products').update(payload).eq('id', id).select('id').single()
        : await supabase.from('products').insert(payload).select('id').single();
      // Si la migración 011 aún no está aplicada, reintenta sin requires_prescription.
      if (result.error && /requires_prescription/i.test(result.error.message)) {
        const { requires_prescription, ...fallback } = payload;
        const retry = isEditing
          ? await supabase.from('products').update(fallback).eq('id', id).select('id').single()
          : await supabase.from('products').insert(fallback).select('id').single();
        if (retry.error) throw retry.error;
        await saveImages(retry.data.id);
        Alert.alert('Producto guardado', 'Guardado, pero la opción "Requiere receta" aún no está disponible en la base de datos. Aplica la migración 011.');
        router.back();
        return;
      }
      if (result.error) throw result.error;

      await saveImages(result.data.id);
      Alert.alert('Producto guardado', isEditing ? 'Los datos y las imágenes se actualizaron.' : 'El producto y sus imágenes están disponibles.');
      router.back();
    } catch (error) {
      Alert.alert('No se pudo guardar el producto', error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <View style={s.loading}><ActivityIndicator color={C.green} /><Text style={s.loadingText}>Cargando producto...</Text></View>;
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.formCard}>
        <Text style={s.eyebrow}>INVENTARIO</Text>
        <Text style={s.title}>{isEditing ? 'Editar producto' : 'Nuevo producto'}</Text>
        <Text style={s.subtitle}>Mantén la información y las imágenes del medicamento actualizadas.</Text>

        <Text style={s.label}>Nombre del producto *</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Paracetamol 500 mg" placeholderTextColor={C.textLight} />

        <Text style={s.label}>Descripción</Text>
        <TextInput style={[s.input, s.multiline]} value={description} onChangeText={setDescription} multiline placeholder="Presentación, concentración y detalles..." placeholderTextColor={C.textLight} />

        <View style={s.twoColumns}>
          <View style={s.column}>
            <Text style={s.label}>Precio de venta *</Text>
            <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textLight} />
          </View>
          <View style={s.column}>
            <Text style={s.label}>Precio de costo</Text>
            <TextInput style={s.input} value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textLight} />
          </View>
        </View>

        <View style={s.twoColumns}>
          <View style={s.column}>
            <Text style={s.label}>Código de barras</Text>
            <TextInput style={s.input} value={barcode} onChangeText={setBarcode} placeholder="775..." placeholderTextColor={C.textLight} />
          </View>
          <View style={s.column}>
            <Text style={s.label}>Stock inicial</Text>
            <TextInput style={s.input} value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" placeholderTextColor={C.textLight} />
          </View>
        </View>

        <View style={s.imageSection}>
          <Text style={s.sectionTitle}>Imágenes del producto</Text>
          <Text style={s.sectionDescription}>Agrega enlaces o toma fotos claras del envase. Se mostrarán en el catálogo.</Text>
          <View style={s.imageActions}>
            <TouchableOpacity style={s.secondaryButton} onPress={() => addPickedImages('camera')} accessibilityRole="button">
              <Ionicons name="camera-outline" size={15} color={C.textMid} />
              <Text style={s.secondaryButtonText}>Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryButton} onPress={() => addPickedImages('library')} accessibilityRole="button">
              <Ionicons name="images-outline" size={15} color={C.textMid} />
              <Text style={s.secondaryButtonText}>Elegir fotos</Text>
            </TouchableOpacity>
          </View>
          <View style={s.urlRow}>
            <TextInput
              style={[s.input, s.urlInput]}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://... URL de imagen"
              placeholderTextColor={C.textLight}
            />
            <TouchableOpacity style={s.addUrlButton} onPress={addImageUrl} accessibilityRole="button">
              <Text style={s.addUrlText}>Añadir</Text>
            </TouchableOpacity>
          </View>
          <View style={s.gallery}>
            {images.map((image, index) => (
              <View key={image.key} style={s.thumbnailWrap}>
                <Image source={{ uri: image.url }} style={s.thumbnail} />
                {index === 0 && <View style={s.mainBadge}><Text style={s.mainBadgeText}>Principal</Text></View>}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Quitar imagen"
                  style={s.removeImage}
                  onPress={() => setImages((current) => current.filter((entry) => entry.key !== image.key))}
                >
                  <Ionicons name="close" size={14} color={C.white} />
                </TouchableOpacity>
              </View>
            ))}
            {!images.length && <Text style={s.noImages}>Aún no hay imágenes añadidas.</Text>}
          </View>
          <Text style={s.helper}>Hasta 12 imágenes · JPG, PNG o WebP · Máximo 5 MB por foto.</Text>
        </View>

        <View style={s.switchRow}>
          <View style={s.switchCopy}>
            <Text style={s.sectionTitle}>Verificación de edad</Text>
            <Text style={s.sectionDescription}>Actívala si el producto tiene restricción +18.</Text>
          </View>
          <Switch
            value={requiresAge}
            onValueChange={setRequiresAge}
            trackColor={{ false: C.borderStrong, true: C.greenMid }}
            thumbColor={C.white}
          />
        </View>

        <View style={s.switchRow}>
          <View style={s.switchCopy}>
            <View style={s.switchTitleRow}>
              <Ionicons name="document-text-outline" size={15} color={C.greenDark} />
              <Text style={s.sectionTitle}>Requiere receta médica</Text>
            </View>
            <Text style={s.sectionDescription}>
              Actívala si el POS debe exigir DNI verificado y número de receta al venderlo.
            </Text>
          </View>
          <Switch
            value={requiresPrescription}
            onValueChange={setRequiresPrescription}
            trackColor={{ false: C.borderStrong, true: C.greenMid }}
            thumbColor={C.white}
          />
        </View>

        <TouchableOpacity style={[s.saveButton, loading && s.disabled]} onPress={handleSave} disabled={loading} accessibilityRole="button">
          {loading ? <ActivityIndicator color={C.white} /> : (
            <>
              <Ionicons name="save-outline" size={17} color={C.white} />
              <Text style={s.saveText}>Guardar producto</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bgPage },
  content: { padding: 20, paddingBottom: 48, alignItems: 'center' },
  formCard: { width: '100%', maxWidth: 760, padding: 24, backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bgPage, gap: 12 },
  loadingText: { color: C.textMid, fontSize: 14 },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  title: { color: C.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { color: C.textMid, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: C.textMid, marginBottom: 7, letterSpacing: 0.3 },
  input: { borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 8, fontSize: 14, color: C.text, marginBottom: 16 },
  multiline: { height: 86, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', gap: 14 },
  column: { flex: 1 },
  imageSection: { paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border, marginTop: 2 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  sectionDescription: { color: C.textMid, fontSize: 13, lineHeight: 19, marginTop: 4 },
  imageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.white,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
  },
  secondaryButtonText: { color: C.textMid, fontSize: 13, fontWeight: '700' },
  urlRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 12 },
  urlInput: { flex: 1 },
  addUrlButton: { backgroundColor: C.accent, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8 },
  addUrlText: { color: C.white, fontSize: 13, fontWeight: '700' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  thumbnailWrap: { width: 104, height: 104, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border, position: 'relative', backgroundColor: C.bgSubtle },
  thumbnail: { width: '100%', height: '100%' },
  mainBadge: { position: 'absolute', left: 5, bottom: 5, backgroundColor: 'rgba(14,43,41,0.82)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  mainBadgeText: { color: C.white, fontSize: 9, fontWeight: '700' },
  removeImage: { position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,43,41,0.8)' },
  noImages: { color: C.textLight, fontSize: 13, paddingVertical: 12 },
  helper: { color: C.textMid, fontSize: 11, marginTop: 10, marginBottom: 18 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border, marginTop: 4 },
  switchCopy: { flex: 1, paddingRight: 12 },
  switchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.green, paddingVertical: 14, borderRadius: 8, marginTop: 8,
  },
  disabled: { opacity: 0.65 },
  saveText: { color: C.white, fontWeight: '700', fontSize: 15 },
});
