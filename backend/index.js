// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

// Load environment variables
dotenv.config();

// Initialize Pinecone and OpenAI
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const indexName = 'kopakopi';
const index = pc.index(indexName);

const app = express();
app.use(express.json());
app.use(cors());

// --- INGESTION FUNCTION (CSV ONLY) ---

async function runCsvIngestion(filePath) {
  console.log('Starting CSV ingestion for:', filePath);
  try {
    const recordsToEmbed = [];
    const parser = fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        delimiter: ','
      }));

    for await (const row of parser) {
      console.log("tttt : ",row.Name);
      const structuredText = `Menu Name: ${row.Name} | Price: Rp ${row.Price} | Description: ${row.Description} | Stock: ${row.Stock}.`;
      recordsToEmbed.push(structuredText);
    }

    if (recordsToEmbed.length === 0) {
      return { success: true, message: 'CSV file was empty or no data could be processed.' };
    }
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: recordsToEmbed,
      dimensions: 1024,
    });

    const finalRecords = embeddingResponse.data.map((embedding, index) => ({
      id: `menu-csv-${index + 1}`,
      values: embedding.embedding,
      metadata: { text: recordsToEmbed[index], chunk_text: recordsToEmbed[index] }
    }));

    console.log(`   - CSV data read and transformed into ${finalRecords.length} vector records.`);
    await index.deleteAll();
    console.log('Upserting new records from CSV...');

    await index.upsert(finalRecords);

    console.log('✅ CSV Ingestion complete!');
    return { success: true, message: `Ingested ${finalRecords.length} records from CSV.` };
  } catch (error) {
    console.error('CSV Ingestion failed:', error);
    return { success: false, message: 'CSV Ingestion process failed.' };
  }
}

// --- MULTER CONFIGURATION (CSV ONLY) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => { fs.mkdirSync('data/', { recursive: true }); cb(null, 'data/'); },
  filename: (req, file, cb) => { cb(null, file.originalname); }
});
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.csv') {
    cb(null, true);
  } else {
    cb(new Error('Upload failed. Only .csv files are allowed.'), false);
  }
};
const upload = multer({ storage: storage, fileFilter: fileFilter });

// --- API ENDPOINTS ---
const ADMIN_PASSWORD = "captainrr12"; // Change this!

app.post('/api/upload', upload.single('knowledgeFile'), async (req, res) => {
  const { password } = req.body;
  const file = req.file;

  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  if (!file) return res.status(400).json({ error: 'No file uploaded, or file type was not .csv.' });

  const filePath = file.path;
  let result;

  try {
    result = await runCsvIngestion(filePath);

    if (result.success) {
      res.json({ message: `File ingested successfully!`, details: result.message });
    } else {
      res.status(500).json({ error: 'Ingestion failed.', details: result.message });
    }
  } catch (error) {
    res.status(500).json({ error: 'An unexpected error occurred.', details: error.message });
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting uploaded file:", err);
      else console.log("Cleaned up uploaded file:", filePath);
    });
  }
});

app.post('/api/chat', async (req, res) => {
  const { question, history = [] } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required' });

  try {
    const questionEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
      dimensions: 1024,
    });

    const searchResults = await index.query({
      topK: 30, 
      vector: questionEmbedding.data[0].embedding,
      includeMetadata: true,
    });

    let context = '';
    if (searchResults.matches && searchResults.matches.length > 0) {
      context = searchResults.matches.map(hit => hit.metadata.text).join('\n\n---\n\n');
    }

    const formattedHistory = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    const messages = [
      { role: 'system', content: `You are a friendly and helpful AI assistant for "The Coffee Shop". Answer questions based on the provided CONTEXT and the ongoing conversation history.` },
      ...formattedHistory,
      { role: 'user', content: `CONTEXT:\n${context}\n\nUSER'S QUESTION:\n${question}\n\nFRIENDLY ANSWER:` }
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      res.write(content);
    }

    res.end();

  } catch (error) {
    console.error('Error in /api/chat stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred on the server.' });
    }
    res.end();
  }
});


// --- NEW: API ENDPOINT TO GET ALL DATA --- (Final Correction)
app.get('/api/data', async (req, res) => {
    try {
        console.log('Fetching all records from Pinecone index...');
        
        let allIds = [];
        // The token for the next page, to be used in the loop.
        // The variable can be named anything, but the property passed to the API must be `paginationToken`.
        let paginationToken;

        do {
            // The argument key MUST be `paginationToken` as per the error message.
            const listResponse = await index.listPaginated({
                paginationToken: paginationToken,
            });

            if (listResponse.vectors && listResponse.vectors.length > 0) {
                const ids = listResponse.vectors.map(v => v.id);
                allIds.push(...ids);
            }

            // Get the token for the next page from the response object.
            paginationToken = listResponse.pagination?.next;
        } while (paginationToken);


        if (allIds.length === 0) {
            console.log('No records found in the index.');
            return res.json({ message: 'No records found in the index.', data: [] });
        }
        
        console.log(`Found ${allIds.length} record IDs. Fetching details...`);

        const allMetadata = [];
        const batchSize = 1000; 
        for (let i = 0; i < allIds.length; i += batchSize) {
            const batchIds = allIds.slice(i, i + batchSize);
            const fetchResponse = await index.fetch(batchIds);
            const records = Object.values(fetchResponse.records);
            const metadata = records.map(record => record.metadata);
            allMetadata.push(...metadata);
        }
        
        console.log('Successfully fetched all records.');
        res.json({ 
            message: `Successfully fetched ${allMetadata.length} records.`, 
            data: allMetadata 
        });

    } catch (error) {
        console.error('Failed to fetch all data:', error);
        res.status(500).json({ error: 'Failed to fetch data from the database.' });
    }
});


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});