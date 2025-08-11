// ingest.js (Perbaikan Final)
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

dotenv.config();
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const indexName = 'kopakopi';

async function main() {
  try {
    console.log('1. Membaca data dari file PDF...');
    const filePath = path.join(process.cwd(), 'data', 'dummy menu.pdf');
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(dataBuffer);
    const text = pdfData.text;

    const lines = text.split('\n').filter(line => line.trim() !== '');
    const dataLines = lines.slice(1); // Melewati header tabel
    const records = [];

    // Mengelompokkan data per 4 baris (Nama, Harga, Deskripsi, Stok)
    for (let i = 0; i < dataLines.length; i += 4) {
      if (dataLines[i + 3] !== undefined) {
        // --- UBAH BARIS DI BAWAH INI ---
        const structuredText = `Menu item kami adalah ${dataLines[i]}. Harganya adalah Rp ${dataLines[i + 1]}. Deskripsi singkat: ${dataLines[i + 2]}. Untuk ketersediaan, stok saat ini adalah ${dataLines[i + 3]} unit.`;

        records.push({
          _id: `menu-${i / 4 + 1}`,
          text: structuredText,
          chunk_text: structuredText
        });
      }
    }

    console.log(`   - Data berhasil diubah menjadi ${records.length} records menu yang terstruktur.`);

    // ... sisa kode untuk mengecek index dan upsert tetap sama ...
    console.log('\n2. Mengecek keberadaan index...');
    const existingIndexes = await pc.listIndexes();
    const indexExists = existingIndexes.indexes?.some(
      (index) => index.name === indexName
    );

    if (!indexExists) {
      console.log(`   - Index '${indexName}' tidak ditemukan. Membuat index baru...`);
      await pc.createIndexForModel({
        name: indexName,
        cloud: 'aws',
        region: 'us-east-1',
        embed: {
          model: 'voyage-2',
          fieldMap: { text: 'chunk_text' },
        },
        waitUntilReady: true,
      });
      console.log('   - Index berhasil dibuat.');
    } else {
      console.log(`   - Index '${indexName}' sudah ada.`);
    }

    console.log('\n3. Memasukkan data (upsert) ke dalam index...');
    const index = pc.index(indexName);
    await index.upsertRecords(records);
    console.log('   - Upsert data berhasil.');

    console.log('\n4. Mengecek status index...');
    const stats = await index.describeIndexStats();
    console.log(stats);
    console.log('\n✅ Proses ingesti data selesai!');

  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  }
}

main();