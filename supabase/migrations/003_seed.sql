-- Migration 003: Seed Data

-- Categorías
INSERT INTO categories (name, description) VALUES
('Medicamentos', 'Medicamentos generales, analgésicos y antiinflamatorios'),
('Cosméticos', 'Cuidado personal, belleza y dermatología'),
('Suplementos', 'Vitaminas, minerales y suplementos deportivos'),
('Primeros Auxilios', 'Vendas, alcohol, gasas y desinfectantes'),
('Bebés y Mamás', 'Pañales, fórmulas y cuidado infantil'),
('Higiene', 'Jabones, shampoos, pastas dentales');

-- Productos de ejemplo
INSERT INTO products (name, description, price, cost_price, stock, min_stock, barcode, is_active, requires_age_verification, age_limit, category_id) VALUES
('Paracetamol 500mg x 20', 'Analgésico y antipirético. Tabletas recubiertas para alivio del dolor y fiebre.', 3.50, 1.80, 150, 20, '7750000000001', true, false, 0, (SELECT id FROM categories WHERE name = 'Medicamentos')),
('Ibuprofeno 400mg x 10', 'Antiinflamatorio no esteroideo para dolor muscular, articular y menstrual.', 5.00, 2.50, 120, 15, '7750000000002', true, false, 0, (SELECT id FROM categories WHERE name = 'Medicamentos')),
('Amoxicilina 500mg x 21', 'Antibiótico de amplio espectro. Requiere receta médica.', 12.00, 6.00, 80, 10, '7750000000003', true, true, 18, (SELECT id FROM categories WHERE name = 'Medicamentos')),
('Loratadina 10mg x 10', 'Antihistamínico para alergias estacionales y rinitis.', 4.50, 2.00, 200, 25, '7750000000004', true, false, 0, (SELECT id FROM categories WHERE name = 'Medicamentos')),
('Omeprazol 20mg x 14', 'Protector gástrico para acidez y reflujo gastroesofágico.', 8.00, 3.50, 90, 15, '7750000000005', true, false, 0, (SELECT id FROM categories WHERE name = 'Medicamentos')),
('Vitamina C 1000mg x 30', 'Suplemento de ácido ascórbico para refuerzo inmunológico.', 15.00, 7.00, 60, 10, '7750000000006', true, false, 0, (SELECT id FROM categories WHERE name = 'Suplementos')),
('Omega 3 Fish Oil x 60', 'Ácidos grasos esenciales EPA y DHA para salud cardiovascular.', 35.00, 18.00, 45, 8, '7750000000007', true, false, 0, (SELECT id FROM categories WHERE name = 'Suplementos')),
('Proteína Whey 1kg Vainilla', 'Proteína de suero de leche concentrada para rendimiento deportivo.', 89.00, 52.00, 25, 5, '7750000000008', true, false, 0, (SELECT id FROM categories WHERE name = 'Suplementos')),
('Crema Facial Hidratante 50ml', 'Crema hidratante con ácido hialurónico y vitamina E.', 28.00, 14.00, 40, 8, '7750000000009', true, false, 0, (SELECT id FROM categories WHERE name = 'Cosméticos')),
('Protector Solar SPF50 120ml', 'Bloqueador solar de amplio espectro, resistente al agua.', 32.00, 16.00, 55, 10, '7750000000010', true, false, 0, (SELECT id FROM categories WHERE name = 'Cosméticos')),
('Alcohol 70° 500ml', 'Alcohol etílico antiséptico para desinfección de heridas.', 6.50, 3.00, 180, 30, '7750000000011', true, false, 0, (SELECT id FROM categories WHERE name = 'Primeros Auxilios')),
('Kit Primeros Auxilios Completo', 'Kit con vendas, gasas, algodón, curitas, tijeras y manual.', 45.00, 22.00, 20, 5, '7750000000012', true, false, 0, (SELECT id FROM categories WHERE name = 'Primeros Auxilios')),
('Pañales Premium Talla M x 40', 'Pañales ultra absorbentes con indicador de humedad.', 42.00, 25.00, 35, 8, '7750000000013', true, false, 0, (SELECT id FROM categories WHERE name = 'Bebés y Mamás')),
('Shampoo Anticaída 400ml', 'Shampoo fortificante con biotina y keratina vegetal.', 22.00, 11.00, 70, 12, '7750000000014', true, false, 0, (SELECT id FROM categories WHERE name = 'Higiene')),
('Pasta Dental Blanqueadora 150g', 'Pasta dental con micropartículas blanqueadoras y flúor activo.', 9.50, 4.50, 100, 20, '7750000000015', true, false, 0, (SELECT id FROM categories WHERE name = 'Higiene')),
('Diclofenaco Gel 1% 60g', 'Gel antiinflamatorio tópico para dolores musculares y articulares.', 14.00, 7.00, 65, 10, '7750000000016', true, false, 0, (SELECT id FROM categories WHERE name = 'Medicamentos'));

-- Nota: El usuario admin se crea desde Supabase Auth Dashboard y luego se asigna role = 'admin' en profiles.
