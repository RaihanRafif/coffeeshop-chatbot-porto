// frontend/src/app/admin/page.tsx
'use client';

import { useState, FormEvent, ChangeEvent } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    // In a real app, you'd verify this with a backend, but for now, it's client-side.
    if (password === 'captainrr12') { // Use the same password as backend
      setIsLoggedIn(true);
      setMessage('');
    } else {
      setMessage('Password salah!');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage('Silakan pilih file terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setMessage('Mengunggah dan memproses file...');

    const formData = new FormData();
    formData.append('knowledgeFile', file);
    formData.append('password', password); // Send password for backend verification

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData, // No 'Content-Type' header needed, browser sets it for FormData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed when upload file.');
      }

      setMessage(data.message);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <form onSubmit={handleLogin} className="p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl text-black font-bold mb-4">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
            className="w-full text-black p-2 border rounded mb-4"
          />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
            Login
          </button>
          {message && <p className="mt-4 text-red-500">{message}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleUpload} className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl text-black font-bold mb-6">Update Database</h1>
        <div className="mb-4">
          <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
            Choose file (.txt or .pdf)
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <button
          type="submit"
          disabled={!file || isLoading}
          className="w-full bg-green-500 text-white p-2 rounded disabled:bg-gray-400"
        >
          {isLoading ? 'Memproses...' : 'Upload and Update'}
        </button>
        {message && <p className="mt-4 text-center">{message}</p>}
      </form>
    </div>
  );
}