-- ─────────────────────────────────────────────────────────────
-- schools  — Malaysian school reference table (KPM-based)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.schools (
  id       UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name     TEXT    NOT NULL,
  type     TEXT    NOT NULL,  -- SK | SJK(C) | SJK(T) | SMK | SMJK | SAM | SABK | SBP | MRSM | Sekolah Swasta | Sekolah Antarabangsa
  level    TEXT    NOT NULL,  -- primary | secondary
  state    TEXT    NOT NULL,
  district TEXT,
  city     TEXT
);

CREATE INDEX idx_schools_name  ON public.schools (name);
CREATE INDEX idx_schools_state ON public.schools (state);
CREATE INDEX idx_schools_type  ON public.schools (type);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read schools" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Admin write schools" ON public.schools FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- ─────────────────────────────────────────────────────────────
-- Seed — representative Malaysian schools (KPM / MOE data)
-- Covers: SBP, MRSM, and top SMK / SMK Agama / SJK per state
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.schools (name, type, level, state, district, city) VALUES

-- ══════════════ SEKOLAH BERASRAMA PENUH (SBP) ══════════════
('Sekolah Berasrama Penuh Integrasi Gombak','SBP','secondary','Selangor','Gombak','Gombak'),
('Sekolah Berasrama Penuh Integrasi Rawang','SBP','secondary','Selangor','Gombak','Rawang'),
('Sekolah Berasrama Penuh Integrasi Seremban','SBP','secondary','Negeri Sembilan','Seremban','Seremban'),
('Sekolah Berasrama Penuh Integrasi Selandar','SBP','secondary','Melaka','Jasin','Selandar'),
('Sekolah Berasrama Penuh Integrasi Batu Rakit','SBP','secondary','Terengganu','Kuala Terengganu','Batu Rakit'),
('Sekolah Berasrama Penuh Integrasi Kuala Berang','SBP','secondary','Terengganu','Hulu Terengganu','Kuala Berang'),
('Sekolah Berasrama Penuh Integrasi Jeli','SBP','secondary','Kelantan','Jeli','Jeli'),
('Sekolah Berasrama Penuh Integrasi Pasir Mas','SBP','secondary','Kelantan','Pasir Mas','Pasir Mas'),
('Sekolah Berasrama Penuh Integrasi Pahi','SBP','secondary','Pahang','Bera','Pahi'),
('Sekolah Berasrama Penuh Integrasi Temerloh','SBP','secondary','Pahang','Temerloh','Temerloh'),
('Sekolah Berasrama Penuh Integrasi Kepala Batas','SBP','secondary','Pulau Pinang','Seberang Perai Utara','Kepala Batas'),
('Sekolah Berasrama Penuh Integrasi Kulim','SBP','secondary','Kedah','Kulim','Kulim'),
('Sekolah Berasrama Penuh Integrasi Sik','SBP','secondary','Kedah','Sik','Sik'),
('Sekolah Berasrama Penuh Integrasi Arau','SBP','secondary','Perlis','Arau','Arau'),
('Sekolah Berasrama Penuh Integrasi Tun Ghazali Shafie','SBP','secondary','Sarawak','Kuching','Kuching'),
('Sekolah Berasrama Penuh Integrasi Sandakan','SBP','secondary','Sabah','Sandakan','Sandakan'),
('Sekolah Menengah Sains Selangor','SBP','secondary','Selangor','Kuala Lumpur','Chow Kit'),
('Sekolah Menengah Sains Johor','SBP','secondary','Johor','Johor Bahru','Johor Bahru'),
('Sekolah Menengah Sains Perak','SBP','secondary','Perak','Batu Gajah','Batu Gajah'),
('Sekolah Menengah Sains Pahang','SBP','secondary','Pahang','Pekan','Pekan'),
('Sekolah Menengah Sains Miri','SBP','secondary','Sarawak','Miri','Miri'),
('Sekolah Menengah Sains Kuching','SBP','secondary','Sarawak','Kuching','Kuching'),
('Sekolah Menengah Sains Kota Kinabalu','SBP','secondary','Sabah','Kota Kinabalu','Kota Kinabalu'),
('Kolej Islam Sultan Alam Shah','SBP','secondary','Selangor','Klang','Klang'),

-- ══════════════ MRSM ══════════════
('MRSM Johor Bahru','MRSM','secondary','Johor','Johor Bahru','Johor Bahru'),
('MRSM Kota Tinggi','MRSM','secondary','Johor','Kota Tinggi','Kota Tinggi'),
('MRSM Muar','MRSM','secondary','Johor','Muar','Muar'),
('MRSM Pontian','MRSM','secondary','Johor','Pontian','Pontian'),
('MRSM Pasir Salak','MRSM','secondary','Perak','Kampar','Pasir Salak'),
('MRSM Taiping','MRSM','secondary','Perak','Larut Matang','Taiping'),
('MRSM Tun Abdul Razak','MRSM','secondary','Perak','Perak Tengah','Bota'),
('MRSM Pengkalan Hulu','MRSM','secondary','Perak','Hulu Perak','Pengkalan Hulu'),
('MRSM Lenggong','MRSM','secondary','Perak','Hulu Perak','Lenggong'),
('MRSM Kuala Klawang','MRSM','secondary','Negeri Sembilan','Jelebu','Kuala Klawang'),
('MRSM Kuala Pilah','MRSM','secondary','Negeri Sembilan','Kuala Pilah','Kuala Pilah'),
('MRSM Serting','MRSM','secondary','Negeri Sembilan','Jempol','Serting'),
('MRSM Tun Hussein Onn Johor','MRSM','secondary','Johor','Mersing','Mersing'),
('MRSM Balik Pulau','MRSM','secondary','Pulau Pinang','Barat Daya','Balik Pulau'),
('MRSM Kepala Batas','MRSM','secondary','Pulau Pinang','Seberang Perai Utara','Kepala Batas'),
('MRSM Kubang Pasu','MRSM','secondary','Kedah','Kubang Pasu','Jitra'),
('MRSM Langkawi','MRSM','secondary','Kedah','Langkawi','Kuah'),
('MRSM Merbok','MRSM','secondary','Kedah','Kuala Muda','Merbok'),
('MRSM Pendang','MRSM','secondary','Kedah','Pendang','Pendang'),
('MRSM Kangar','MRSM','secondary','Perlis','Perlis','Kangar'),
('MRSM Kota Bharu','MRSM','secondary','Kelantan','Kota Bharu','Kota Bharu'),
('MRSM Pasir Puteh','MRSM','secondary','Kelantan','Pasir Puteh','Pasir Puteh'),
('MRSM Pengkalan Chepa','MRSM','secondary','Kelantan','Kota Bharu','Pengkalan Chepa'),
('MRSM Kuala Krai','MRSM','secondary','Kelantan','Kuala Krai','Kuala Krai'),
('MRSM Kuala Terengganu','MRSM','secondary','Terengganu','Kuala Terengganu','Kuala Terengganu'),
('MRSM Dungun','MRSM','secondary','Terengganu','Dungun','Dungun'),
('MRSM Besut','MRSM','secondary','Terengganu','Besut','Jerteh'),
('MRSM Muadzam Shah','MRSM','secondary','Pahang','Rompin','Muadzam Shah'),
('MRSM Kuantan','MRSM','secondary','Pahang','Kuantan','Kuantan'),
('MRSM Kuala Lipis','MRSM','secondary','Pahang','Lipis','Kuala Lipis'),
('MRSM Maran','MRSM','secondary','Pahang','Maran','Maran'),
('MRSM Terendak','MRSM','secondary','Melaka','Alor Gajah','Alor Gajah'),
('MRSM Kota Putra','MRSM','secondary','Kelantan','Pasir Mas','Rantau Panjang'),
('MRSM Betong','MRSM','secondary','Sarawak','Betong','Betong'),
('MRSM Mukah','MRSM','secondary','Sarawak','Mukah','Mukah'),
('MRSM Samarahan','MRSM','secondary','Sarawak','Samarahan','Samarahan'),
('MRSM Miri','MRSM','secondary','Sarawak','Miri','Miri'),
('MRSM Kota Kinabalu','MRSM','secondary','Sabah','Kota Kinabalu','Kota Kinabalu'),
('MRSM Tawau','MRSM','secondary','Sabah','Tawau','Tawau'),
('MRSM Keningau','MRSM','secondary','Sabah','Keningau','Keningau'),
('MRSM Kudat','MRSM','secondary','Sabah','Kudat','Kudat'),
('MRSM Sandakan','MRSM','secondary','Sabah','Sandakan','Sandakan'),

-- ══════════════ SMK — KUALA LUMPUR / W.P. ══════════════
('SMK Tun Hussein Onn','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SMK Bukit Bintang','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SMK Loke Yew','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SMK Seri Ampang','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Ampang'),
('SMK Seri Permaisuri','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Cheras'),
('SMK Bandar Tun Razak','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Cheras'),
('SMK Wangsa Maju','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Wangsa Maju'),
('SMK Setapak','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Setapak'),
('SMK Kepong Baru','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kepong'),
('SMK Sri Petaling','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Sri Petaling'),
('SMK Datok Keramat','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Datok Keramat'),
('SMK Taman Desa','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Taman Desa'),
('SMK La Salle Brickfields','SMK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Brickfields'),

-- ══════════════ SMJK — KUALA LUMPUR ══════════════
('SMJK Confucian','SMJK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SMJK Chong Hwa','SMJK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SMJK Kuen Cheng','SMJK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SMJK Yoke Kuan','SMJK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SMJK Yu Hua','SMJK','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),

-- ══════════════ SMK — SELANGOR ══════════════
('SMK Bandar Sunway','SMK','secondary','Selangor','Petaling','Subang Jaya'),
('SMK Seafield','SMK','secondary','Selangor','Petaling','Subang Jaya'),
('SMK Taman Sea','SMK','secondary','Selangor','Petaling','Petaling Jaya'),
('SMK Damansara Jaya','SMK','secondary','Selangor','Petaling','Petaling Jaya'),
('SMK Assunta','SMK','secondary','Selangor','Petaling','Petaling Jaya'),
('SMK SS17 Subang Jaya','SMK','secondary','Selangor','Petaling','Subang Jaya'),
('SMK Subang Jaya','SMK','secondary','Selangor','Petaling','Subang Jaya'),
('SMK Puchong Perdana','SMK','secondary','Selangor','Petaling','Puchong'),
('SMK USJ 8','SMK','secondary','Selangor','Petaling','Subang Jaya'),
('SMK USJ 13','SMK','secondary','Selangor','Petaling','Subang Jaya'),
('SMK Bukit Jelutong','SMK','secondary','Selangor','Shah Alam','Shah Alam'),
('SMK Shah Alam','SMK','secondary','Selangor','Shah Alam','Shah Alam'),
('SMK Seksyen 7 Shah Alam','SMK','secondary','Selangor','Shah Alam','Shah Alam'),
('SMK Seksyen 4 Bandar Kinrara','SMK','secondary','Selangor','Petaling','Puchong'),
('SMK Puchong Utama','SMK','secondary','Selangor','Petaling','Puchong'),
('SMK Klang Baru','SMK','secondary','Selangor','Klang','Klang'),
('SMK Pandamaran Jaya','SMK','secondary','Selangor','Klang','Port Klang'),
('SMK Kapar','SMK','secondary','Selangor','Klang','Kapar'),
('SMK Rawang','SMK','secondary','Selangor','Gombak','Rawang'),
('SMK Seri Gombak','SMK','secondary','Selangor','Gombak','Batu Caves'),
('SMK Batu Caves','SMK','secondary','Selangor','Gombak','Batu Caves'),
('SMK Hulu Kelang','SMK','secondary','Selangor','Gombak','Ampang'),
('SMK Sungai Buloh','SMK','secondary','Selangor','Petaling','Sungai Buloh'),
('SMK Bangi','SMK','secondary','Selangor','Hulu Langat','Bangi'),
('SMK Seri Kembangan','SMK','secondary','Selangor','Sepang','Seri Kembangan'),
('SMK Cyberjaya','SMK','secondary','Selangor','Sepang','Cyberjaya'),
('SMK Dengkil','SMK','secondary','Selangor','Sepang','Dengkil'),
('SMK Banting','SMK','secondary','Selangor','Kuala Langat','Banting'),

-- ══════════════ SMJK — SELANGOR ══════════════
('SMJK Kheow Bin','SMJK','secondary','Selangor','Klang','Klang'),
('SMJK Tsun Jin','SMJK','secondary','Selangor','Petaling','Petaling Jaya'),
('SMJK Katholik','SMJK','secondary','Selangor','Petaling','Petaling Jaya'),
('SMJK Yak Chee','SMJK','secondary','Selangor','Petaling','Petaling Jaya'),

-- ══════════════ SMK — JOHOR ══════════════
('SMK Tun Habab','SMK','secondary','Johor','Kota Tinggi','Kota Tinggi'),
('SMK Senai','SMK','secondary','Johor','Kulaijaya','Senai'),
('SMK Skudai','SMK','secondary','Johor','Johor Bahru','Skudai'),
('SMK Sri Tebrau','SMK','secondary','Johor','Johor Bahru','Johor Bahru'),
('SMK Kota Masai','SMK','secondary','Johor','Pasir Gudang','Pasir Gudang'),
('SMK Taman Pelangi','SMK','secondary','Johor','Johor Bahru','Johor Bahru'),
('SMK Bandar Baru Uda','SMK','secondary','Johor','Johor Bahru','Johor Bahru'),
('SMK Permas Jaya','SMK','secondary','Johor','Johor Bahru','Masai'),
('SMK Muar','SMK','secondary','Johor','Muar','Muar'),
('SMK Sultan Ibrahim Batu Pahat','SMK','secondary','Johor','Batu Pahat','Batu Pahat'),
('SMK Mersing','SMK','secondary','Johor','Mersing','Mersing'),
('SMK Kluang','SMK','secondary','Johor','Kluang','Kluang'),
('SMK Segamat','SMK','secondary','Johor','Segamat','Segamat'),
('SMK Pontian','SMK','secondary','Johor','Pontian','Pontian'),

-- ══════════════ SMK — PERAK ══════════════
('SMK Anderson','SMK','secondary','Perak','Kinta','Ipoh'),
('SMK Ave Maria Convent','SMK','secondary','Perak','Kinta','Ipoh'),
('SMK St Michael Ipoh','SMK','secondary','Perak','Kinta','Ipoh'),
('SMK Seri Ampang Ipoh','SMK','secondary','Perak','Kinta','Ipoh'),
('SMK Seri Iskandar','SMK','secondary','Perak','Perak Tengah','Seri Iskandar'),
('SMK Batu Gajah','SMK','secondary','Perak','Kinta','Batu Gajah'),
('SMK Teluk Intan','SMK','secondary','Perak','Hilir Perak','Teluk Intan'),
('SMK Gopeng','SMK','secondary','Perak','Kinta','Gopeng'),
('SMK Taiping','SMK','secondary','Perak','Larut Matang','Taiping'),
('SMK Sungai Siput','SMK','secondary','Perak','Kuala Kangsar','Sungai Siput'),

-- ══════════════ SMK — NEGERI SEMBILAN ══════════════
('SMK Tuanku Abdul Halim','SMK','secondary','Negeri Sembilan','Seremban','Seremban'),
('SMK Rahang','SMK','secondary','Negeri Sembilan','Seremban','Seremban'),
('SMK Seri Pagi','SMK','secondary','Negeri Sembilan','Seremban','Seremban'),
('SMK Dato Undang Rembau','SMK','secondary','Negeri Sembilan','Rembau','Rembau'),
('SMK Port Dickson','SMK','secondary','Negeri Sembilan','Port Dickson','Port Dickson'),

-- ══════════════ SMK — MELAKA ══════════════
('SMK Datuk Abdul Samad','SMK','secondary','Melaka','Melaka Tengah','Melaka'),
('SMK Gajah Berang','SMK','secondary','Melaka','Melaka Tengah','Melaka'),
('SMK Ayer Keroh','SMK','secondary','Melaka','Melaka Tengah','Ayer Keroh'),
('SMK Bukit Katil','SMK','secondary','Melaka','Melaka Tengah','Bukit Katil'),
('SMK Merlimau','SMK','secondary','Melaka','Jasin','Merlimau'),

-- ══════════════ SMK — PULAU PINANG ══════════════
('SMK Heng Ee','SMK','secondary','Pulau Pinang','Timur Laut','Pulau Pinang'),
('SMK St George','SMK','secondary','Pulau Pinang','Timur Laut','Pulau Pinang'),
('SMK Penang Free School','SMK','secondary','Pulau Pinang','Timur Laut','Pulau Pinang'),
('SMK Convent Pulau Tikus','SMK','secondary','Pulau Pinang','Timur Laut','Pulau Pinang'),
('SMK Gelugor','SMK','secondary','Pulau Pinang','Timur Laut','Gelugor'),
('SMK Bukit Mertajam','SMK','secondary','Pulau Pinang','Seberang Perai Tengah','Bukit Mertajam'),
('SMK St Mark Butterworth','SMK','secondary','Pulau Pinang','Seberang Perai Utara','Butterworth'),
('SMK Sungai Bakap','SMK','secondary','Pulau Pinang','Seberang Perai Selatan','Nibong Tebal'),

-- ══════════════ SMJK — PULAU PINANG ══════════════
('SMJK Chung Ling','SMJK','secondary','Pulau Pinang','Timur Laut','Pulau Pinang'),
('SMJK Heng Ee','SMJK','secondary','Pulau Pinang','Timur Laut','Pulau Pinang'),
('SMJK Jit Sin','SMJK','secondary','Pulau Pinang','Seberang Perai Tengah','Bukit Mertajam'),
('SMJK Pertak','SMJK','secondary','Pulau Pinang','Seberang Perai Tengah','Bukit Mertajam'),

-- ══════════════ SMK — KEDAH ══════════════
('SMK Sultanah Asma','SMK','secondary','Kedah','Kota Setar','Alor Setar'),
('SMK Jalan Stadium','SMK','secondary','Kedah','Kota Setar','Alor Setar'),
('SMK Pendang','SMK','secondary','Kedah','Pendang','Pendang'),
('SMK Kubang Pasu','SMK','secondary','Kedah','Kubang Pasu','Jitra'),
('SMK Bedong','SMK','secondary','Kedah','Kuala Muda','Bedong'),
('SMK Sungai Petani','SMK','secondary','Kedah','Kuala Muda','Sungai Petani'),

-- ══════════════ SMK — KELANTAN ══════════════
('SMK Dato Mahmud Mat','SMK','secondary','Kelantan','Kota Bharu','Kota Bharu'),
('SMK Zainab 2','SMK','secondary','Kelantan','Kota Bharu','Kota Bharu'),
('SMK Wakaf Bharu','SMK','secondary','Kelantan','Pasir Mas','Wakaf Bharu'),
('SMK Tanah Merah','SMK','secondary','Kelantan','Tanah Merah','Tanah Merah'),
('SMK Machang','SMK','secondary','Kelantan','Machang','Machang'),
('SMK Kok Lanas','SMK','secondary','Kelantan','Kota Bharu','Kok Lanas'),

-- ══════════════ SMK — TERENGGANU ══════════════
('SMK Sultan Sulaiman','SMK','secondary','Terengganu','Kuala Terengganu','Kuala Terengganu'),
('SMK Ladang','SMK','secondary','Terengganu','Kuala Terengganu','Kuala Terengganu'),
('SMK Padang Midin','SMK','secondary','Terengganu','Kuala Terengganu','Kuala Terengganu'),
('SMK Bukit Besar','SMK','secondary','Terengganu','Kuala Terengganu','Kuala Terengganu'),
('SMK Kuala Besut','SMK','secondary','Terengganu','Besut','Besut'),
('SMK Chendering','SMK','secondary','Terengganu','Kuala Terengganu','Chendering'),
('SMK Dungun','SMK','secondary','Terengganu','Dungun','Dungun'),

-- ══════════════ SMK — PAHANG ══════════════
('SMK Tengku Ampuan Afzan','SMK','secondary','Pahang','Kuantan','Kuantan'),
('SMK Seri Mahkota Kuantan','SMK','secondary','Pahang','Kuantan','Kuantan'),
('SMK Pandan','SMK','secondary','Pahang','Kuantan','Kuantan'),
('SMK Air Putih','SMK','secondary','Pahang','Kuantan','Kuantan'),
('SMK Dato Mohd Said','SMK','secondary','Pahang','Temerloh','Temerloh'),
('SMK Bentong','SMK','secondary','Pahang','Bentong','Bentong'),
('SMK Fraser Hill','SMK','secondary','Pahang','Raub','Fraser Hill'),
('SMK Pekan','SMK','secondary','Pahang','Pekan','Pekan'),

-- ══════════════ SMK — SARAWAK ══════════════
('SMK Batu Lintang','SMK','secondary','Sarawak','Kuching','Kuching'),
('SMK Green Road','SMK','secondary','Sarawak','Kuching','Kuching'),
('SMK Siol Kandis','SMK','secondary','Sarawak','Kuching','Kuching'),
('SMK Pending','SMK','secondary','Sarawak','Kuching','Kuching'),
('SMK Miri','SMK','secondary','Sarawak','Miri','Miri'),
('SMK Lutong','SMK','secondary','Sarawak','Miri','Miri'),
('SMK Sibu','SMK','secondary','Sarawak','Sibu','Sibu'),
('SMK Bintulu','SMK','secondary','Sarawak','Bintulu','Bintulu'),
('SMK Kapit','SMK','secondary','Sarawak','Kapit','Kapit'),

-- ══════════════ SMK — SABAH ══════════════
('SMK All Saints','SMK','secondary','Sabah','Kota Kinabalu','Kota Kinabalu'),
('SMK St Francis Xavier','SMK','secondary','Sabah','Kota Kinabalu','Kota Kinabalu'),
('SMK Likas','SMK','secondary','Sabah','Kota Kinabalu','Likas'),
('SMK Kepayan','SMK','secondary','Sabah','Kota Kinabalu','Kepayan'),
('SMK Sandakan','SMK','secondary','Sabah','Sandakan','Sandakan'),
('SMK Tawau','SMK','secondary','Sabah','Tawau','Tawau'),
('SMK Lahad Datu','SMK','secondary','Sabah','Lahad Datu','Lahad Datu'),
('SMK Keningau','SMK','secondary','Sabah','Keningau','Keningau'),
('SMK Beaufort','SMK','secondary','Sabah','Beaufort','Beaufort'),

-- ══════════════ SMK AGAMA (SAM / SABK) ══════════════
('Sekolah Menengah Agama Sultan Hishamuddin','SAM','secondary','Selangor','Klang','Klang'),
('Sekolah Menengah Agama Persekutuan Kajang','SAM','secondary','Selangor','Hulu Langat','Kajang'),
('Sekolah Menengah Agama Persekutuan Labu','SAM','secondary','Negeri Sembilan','Seremban','Labu'),
('Sekolah Menengah Agama Persekutuan Temerloh','SAM','secondary','Pahang','Temerloh','Temerloh'),
('Sekolah Agama Menengah Kedah','SAM','secondary','Kedah','Kota Setar','Alor Setar'),
('Sekolah Agama Menengah Kelantan','SAM','secondary','Kelantan','Kota Bharu','Kota Bharu'),

-- ══════════════ SEKOLAH RENDAH (PRIMARY) ══════════════
-- SK
('SK Taman Tun Dr Ismail','SK','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Taman Tun Dr Ismail'),
('SK Bangsar','SK','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Bangsar'),
('SK Seri Hartamas','SK','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Sri Hartamas'),
('SK Bukit Damansara','SK','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Damansara'),
('SK Damansara Jaya','SK','primary','Selangor','Petaling','Petaling Jaya'),
('SK Subang Jaya','SK','primary','Selangor','Petaling','Subang Jaya'),
('SK Seri Bintang Utara','SK','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Cheras'),
('SK Seri Bintang Selatan','SK','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Cheras'),
('SK USJ 12','SK','primary','Selangor','Petaling','Subang Jaya'),
('SK USJ 4','SK','primary','Selangor','Petaling','Subang Jaya'),
('SK Bandar Baru Bangi','SK','primary','Selangor','Hulu Langat','Bangi'),
('SK Bukit Jelutong','SK','primary','Selangor','Shah Alam','Shah Alam'),
-- SJK(C)
('SJK(C) Chong Hwa Kuala Lumpur','SJK(C)','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SJK(C) Yoke Nam','SJK(C)','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SJK(C) Pudu 1','SJK(C)','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Pudu'),
('SJK(C) Lai Meng','SJK(C)','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur'),
('SJK(C) Kepong','SJK(C)','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kepong'),
('SJK(C) Yuk Chyun Petaling Jaya','SJK(C)','primary','Selangor','Petaling','Petaling Jaya'),
('SJK(C) Subang','SJK(C)','primary','Selangor','Petaling','Subang Jaya'),
('SJK(C) Kheow Bin Klang','SJK(C)','primary','Selangor','Klang','Klang'),
-- SJK(T)
('SJK(T) Vivekananda Brickfields','SJK(T)','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Brickfields'),
('SJK(T) Ladang Sungai Way','SJK(T)','primary','Selangor','Petaling','Petaling Jaya'),
('SJK(T) Ladang Bukit Jalil','SJK(T)','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Bukit Jalil'),
('SJK(T) Segambut','SJK(T)','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Segambut'),

-- ══════════════ SEKOLAH SWASTA / ANTARABANGSA ══════════════
('Alice Smith School','Sekolah Antarabangsa','secondary','Selangor','Ampang','Ampang'),
('Garden International School','Sekolah Antarabangsa','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Mont Kiara'),
('International School of Kuala Lumpur','Sekolah Antarabangsa','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Ampang'),
('Dalton International School','Sekolah Antarabangsa','secondary','Selangor','Petaling','Petaling Jaya'),
('Fairview International School','Sekolah Antarabangsa','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Wangsa Maju'),
('Taylor''s International School','Sekolah Antarabangsa','secondary','Selangor','Petaling','Subang Jaya'),
('Sri KDU International School','Sekolah Antarabangsa','secondary','Selangor','Petaling','Subang Jaya'),
('Nexus International School','Sekolah Antarabangsa','secondary','Selangor','Petaling','Putrajaya'),
('Help International School','Sekolah Antarabangsa','secondary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Damansara'),
('Rafflesia International School','Sekolah Swasta','secondary','Selangor','Gombak','Rawang'),
('SMK Seri Intan','Sekolah Swasta','secondary','Selangor','Petaling','Petaling Jaya'),
('SK Sri Garden','Sekolah Swasta','primary','Wilayah Persekutuan Kuala Lumpur','Kuala Lumpur','Kuala Lumpur');
