'use client';

import { useEffect, useState } from 'react';
import { Copy, Code, Smartphone, ArrowRight, CheckCircle, AlertCircle, Loader2, Download, RefreshCw } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useRouter } from 'next/navigation';

const CodeConversion = () => {
  const [code, setCode] = useState('');
  const [convertedCode, setConvertedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('session-id')) {
      router.push("/")
    }
  }, []);

  const handleSubmit = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    setConvertedCode('');

    try {
      const response = await fetch('http://localhost:5000/api/conversion/convert/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok) {
        setConvertedCode(data.convertedCode);
      } else {
        setError(data.error || 'Something went wrong!');
      }
    } catch (err) {
      setError('Failed to fetch from server');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = (code: string) => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'converted-react-native.tsx';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const clearAll = () => {
    setCode('');
    setConvertedCode('');
    setError('');
  };

  const sampleCode = `import React, { useState } from 'react';

const MyComponent = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};

export default MyComponent;`;

  const loadSample = () => {
    setCode(sampleCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900">
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Code className="w-8 h-8 text-white" />
            </div>
            <ArrowRight className="w-6 h-6 text-purple-400" />
            <div className="p-3 bg-green-600 rounded-xl">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            React to React Native
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Transform your React components into React Native code instantly with AI-powered conversion
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* React Code Input Section */}
          <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Code className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-semibold text-white">React Code</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadSample}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sample
                </button>
                <button
                  onClick={clearAll}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="relative">
              {/* Editable React Code Section */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-96 p-4 bg-gray-900/80 text-white rounded-xl border border-gray-600/50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm resize-none"
                placeholder="Paste your React code here..."
                spellCheck={false}
              />
              <div className="absolute bottom-4 right-4 text-xs text-gray-400">
                {code.length} characters
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !code.trim()}
              className="w-full mt-6 p-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Convert to React Native
                </>
              )}
            </button>
          </div>

          {/* React Native Code Output Section */}
          <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-semibold text-white">React Native Code</h2>
              </div>
              {convertedCode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(convertedCode)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => downloadCode(convertedCode)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}
            </div>

            <div className="relative h-96">
              {convertedCode ? (
                <div className="h-full overflow-hidden rounded-xl">
                  <SyntaxHighlighter
                    language="typescript"
                    style={vscDarkPlus}
                    className="h-full no-scrollbar"
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      height: '100%',
                      backgroundColor: 'rgba(17, 24, 39, 0.8)',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '0.75rem',
                    }}
                    wrapLongLines={true}
                    showLineNumbers={true}
                    lineNumberStyle={{
                      color: '#6B7280',
                      paddingRight: '1rem',
                      marginRight: '1rem',
                      borderRight: '1px solid #374151',
                      minWidth: '2.5rem'
                    }}
                  >
                    {convertedCode}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-900/60 rounded-xl border-2 border-dashed border-gray-600/50">
                  <div className="text-center">
                    <Smartphone className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">
                      {loading ? 'Converting your code...' : 'Converted React Native code will appear here'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-8 p-4 bg-red-900/40 border border-red-500/30 rounded-xl backdrop-blur-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-red-400 font-semibold mb-1">Conversion Error</h3>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeConversion;
