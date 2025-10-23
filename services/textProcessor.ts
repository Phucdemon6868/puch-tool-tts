
import { mammoth } from '../globals';

type SubtitleChunk = { text: string; timestamp: string };

const parseSrtContent = (data: string): SubtitleChunk[] => {
    const blocks = data.trim().replace(/\r/g, '').split('\n\n');
    return blocks.map(block => {
        const lines = block.split('\n');
        if (lines.length < 3) return null;
        const timestamp = lines[1];
        const text = lines.slice(2).join('\n').replace(/<[^>]*>/g, '').trim();
        if (!text) return null;
        return { text, timestamp };
    }).filter((chunk): chunk is SubtitleChunk => chunk !== null);
};

const parseVttContent = (data: string): SubtitleChunk[] => {
    const blocks = data.trim().replace(/\r/g, '').split('\n\n').slice(1); // Remove WEBVTT header
    return blocks.map(block => {
        const lines = block.split('\n');
        if (lines.length < 2) return null;
        const timestamp = lines[0];
        const text = lines.slice(1).join('\n').replace(/<[^>]*>/g, '').trim();
        if (!text) return null;
        return { text, timestamp };
    }).filter((chunk): chunk is SubtitleChunk => chunk !== null);
};

export class TextProcessor {
    private maxChars: number;
    private minCharsToMerge: number;

    constructor(maxChars: number = 1500, minCharsToMerge: number = 30) {
        if (maxChars <= 0) {
            throw new Error("max_chars must be a positive number.");
        }
        this.maxChars = maxChars;
        this.minCharsToMerge = minCharsToMerge;
    }

    private cleanText(text: string): string {
        let cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        cleaned = cleaned.replace(/\n{2,}/g, '\n');
        cleaned = cleaned.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
        const lines = cleaned.split('\n');
        const cleanedLines = lines.map(line => line.replace(/[ \t]+/g, ' ').trim());
        return cleanedLines.join('\n').trim();
    }

    private splitLongSentence(sentence: string): string[] {
        const subSentences: string[] = [];
        let currentPart = sentence;
        const delimiters = [',', '!', '?', ':', ';', ' '];
        while (currentPart.length > this.maxChars) {
            let cutPos = -1;
            for (const delim of delimiters) {
                const foundPos = currentPart.lastIndexOf(delim, this.maxChars);
                if (foundPos !== -1) {
                    cutPos = foundPos + 1;
                    break;
                }
            }
            if (cutPos === -1) {
                cutPos = this.maxChars;
            }
            subSentences.push(currentPart.substring(0, cutPos).trim());
            currentPart = currentPart.substring(cutPos).trim();
        }
        if (currentPart) {
            subSentences.push(currentPart);
        }
        return subSentences;
    }

    public process(text: string): string[] {
        const cleanedText = this.cleanText(text);
        const paragraphs = cleanedText.split('\n').filter(p => p);
        
        const allSentences: string[] = [];
        for (const para of paragraphs) {
            const sentencesInPara = para.split('.')
                                      .map(s => s.trim())
                                      .filter(s => s) 
                                      .map(s => s + '.');
            
            if (!para.endsWith('.') && sentencesInPara.length > 0) {
                const lastIndex = sentencesInPara.length - 1;
                sentencesInPara[lastIndex] = sentencesInPara[lastIndex].slice(0, -1);
            }
            allSentences.push(...sentencesInPara);
        }
        
        const chunks: string[] = [];
        let currentChunk = "";

        for (const sentence of allSentences) {
            if (sentence.length > this.maxChars) {
                if (currentChunk) {
                    chunks.push(currentChunk);
                }
                currentChunk = "";
                chunks.push(...this.splitLongSentence(sentence));
                continue;
            }
            if (currentChunk.length + sentence.length + 1 > this.maxChars) {
                if (currentChunk) {
                    chunks.push(currentChunk);
                }
                currentChunk = sentence;
            } else {
                currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        if (chunks.length === 0 && text.trim().length > 0) {
             return [text]; 
        }
        if (chunks.length === 0) {
            return [];
        }

        if (chunks.length >= 2 && chunks[chunks.length - 1].length < this.minCharsToMerge) {
            const lastChunk = chunks.pop()!;
            const secondToLastChunk = chunks[chunks.length - 1];

            if (secondToLastChunk.length + lastChunk.length + 1 <= this.maxChars) {
                chunks[chunks.length - 1] += " " + lastChunk;
            } else {
                const sentencesInChunk = secondToLastChunk.split(/(?<=[.?!])\s+/);
                if (sentencesInChunk.length > 1) {
                    const sentenceToMove = sentencesInChunk.pop()!;
                    const newLastChunk = `${sentenceToMove} ${lastChunk}`;

                    if (newLastChunk.length <= this.maxChars) {
                        chunks[chunks.length - 1] = sentencesInChunk.join(" ");
                        chunks.push(newLastChunk);
                    } else {
                         chunks.push(lastChunk); 
                    }
                } else {
                    chunks.push(lastChunk);
                }
            }
        }
        return chunks.filter(c => c.length > 0);
    }
    
    public static async processFromFile(file: File): Promise<string | SubtitleChunk[]> {
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onerror = () => reject(new Error(`Failed to read .${extension} file`));

            if (extension === 'srt' || extension === 'vtt') {
                reader.onload = (e) => {
                    const text = e.target?.result as string;
                    if (extension === 'srt') {
                        resolve(parseSrtContent(text));
                    } else {
                        resolve(parseVttContent(text));
                    }
                };
                reader.readAsText(file);
            } else if (extension === 'txt') {
                 reader.onload = (e) => {
                    resolve(e.target?.result as string);
                };
                reader.readAsText(file);
            } else if (extension === 'docx') {
                if (typeof mammoth === 'undefined') {
                    return reject(new Error('DOCX processing library (mammoth.js) is not loaded.'));
                }
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target?.result as ArrayBuffer;
                        const result = await mammoth.extractRawText({ arrayBuffer });
                        resolve(result.value);
                    } catch (err) {
                        reject(new Error('Failed to parse .docx file.'));
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                reject(new Error(`Unsupported file format: .${extension}`));
            }
        });
    }
}