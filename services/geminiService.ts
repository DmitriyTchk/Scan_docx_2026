import { GoogleGenAI, Type } from "@google/genai";
import { TableData, Column, VoiceUpdateResult, Cell, WorkflowPlan, Language } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY; 
  if (!apiKey) {
    throw new Error("CRITICAL: process.env.API_KEY is missing/undefined.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Uses Gemini Vision to convert an image of a table into a structured JSON.
 */
export const convertImageToTable = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<Partial<TableData>> => {
  try {
    const ai = getAI();
    
    const prompt = `
      Analyze this image of a table. 
      Extract the column headers and the data rows.
      
      Output a JSON object with:
      1. 'columns': A list of column definitions. Generate unique snake_case IDs.
      2. 'rows': A list of rows. Each row must contain a 'cells' array.
      3. 'cells': Each cell object must have a 'columnId' (matching a column from step 1) and a 'value' (as a string).
      
      If headers are missing, generate logical headers.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                columns: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            label: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["text", "number", "date", "boolean"] }
                        },
                        required: ["id", "label", "type"]
                    }
                },
                rows: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            cells: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        columnId: { type: Type.STRING },
                                        value: { type: Type.STRING }
                                    },
                                    required: ["columnId", "value"]
                                }
                            }
                        },
                        required: ["cells"]
                    }
                }
            },
            required: ["columns", "rows"]
        }
      }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        
        const rows: Cell[] = data.rows.map((r: any) => {
            const cell: Cell = {};
            if (r.cells && Array.isArray(r.cells)) {
                r.cells.forEach((c: any) => {
                    if (c.columnId) {
                        cell[c.columnId] = c.value;
                    }
                });
            }
            return cell;
        });

        return {
            columns: data.columns,
            rows: rows
        };
    }
    throw new Error("Gemini returned an empty text response.");

  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    const msg = error.message || "Unknown API error";
    throw new Error(msg);
  }
};

export const parseVoiceCommand = async (
  transcript: string,
  currentColumns: Column[],
  rowCount: number,
  language: Language = 'en'
): Promise<VoiceUpdateResult> => {
  try {
    const ai = getAI();
    const columnContext = currentColumns.map(c => `${c.label} (ID: ${c.id})`).join(', ');

    const prompt = `
      You are a data entry assistant. Language: ${language === 'ru' ? 'Russian' : 'English'}.
      The table has ${rowCount} rows.
      Columns: [${columnContext}].
      User said: "${transcript}".
      
      Interpret the user's intent:
      1. Action: 'append', 'update', 'delete', or 'unknown'.
      2. Row Index: 0-based index for updates, -1 for append.
      3. Updates: A list of changed fields. Each field has 'columnId' and 'value'.
      4. Feedback: A short confirmation message in ${language === 'ru' ? 'Russian' : 'English'}.
      
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['update', 'append', 'delete', 'unknown'] },
                feedback: { type: Type.STRING },
                rowUpdates: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            rowIndex: { type: Type.INTEGER },
                            fields: { 
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        columnId: { type: Type.STRING },
                                        value: { type: Type.STRING }
                                    },
                                    required: ["columnId", "value"]
                                }
                            }
                        },
                        required: ["rowIndex", "fields"]
                    }
                }
            },
            required: ["action", "rowUpdates", "feedback"]
        }
      }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        const result: VoiceUpdateResult = {
            action: data.action,
            feedback: data.feedback,
            rowUpdates: data.rowUpdates.map((u: any) => {
                const updatesMap: { [key: string]: string | number } = {};
                if (u.fields && Array.isArray(u.fields)) {
                    u.fields.forEach((f: any) => {
                        updatesMap[f.columnId] = f.value;
                    });
                }
                return {
                    rowIndex: u.rowIndex,
                    updates: updatesMap
                };
            })
        };
        return result;
    }
    throw new Error("No parsed command returned");
  } catch (error: any) {
    console.error("Voice Parse Error:", error);
    throw new Error(error.message || "Failed to understand voice command.");
  }
};

/**
 * Generates a logical workflow to fill the table step-by-step.
 */
export const generateWorkflow = async (table: TableData, language: Language = 'en'): Promise<WorkflowPlan> => {
  try {
    const ai = getAI();
    
    const rowsSample = JSON.stringify(table.rows.slice(0, 3)); 
    const columnsJson = JSON.stringify(table.columns);

    const prompt = `
      You are an expert industrial process analyst.
      Language: ${language === 'ru' ? 'Russian' : 'English'}.
      I have a table with these columns: ${columnsJson}.
      Here is a sample of the data: ${rowsSample}.
      Total rows in table: ${table.rows.length}.

      Create a logical "Guided Voice Entry Pipeline".
      
      Logic rules:
      1. Identify Key columns (Anode, Object ID).
      2. Identify Data columns to be filled.
      3. Create a sequential list of steps.
      4. Grouping: Input side vs Output side.
      5. The 'instruction' MUST be in ${language === 'ru' ? 'Russian' : 'English'} language.
      6. The instruction should be concise for Text-to-Speech (e.g. "Anode 1, Input").
      
      Return a JSON with:
      - description: Strategy summary in ${language === 'ru' ? 'Russian' : 'English'}.
      - steps: Array of steps.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING },
                steps: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            instruction: { type: Type.STRING },
                            targetRowIndex: { type: Type.INTEGER },
                            targetColumnId: { type: Type.STRING },
                            expectedType: { type: Type.STRING, enum: ['number', 'text'] }
                        },
                        required: ["instruction", "targetRowIndex", "targetColumnId"]
                    }
                }
            },
            required: ["description", "steps"]
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as WorkflowPlan;
    }
    throw new Error("Failed to generate workflow");

  } catch (error: any) {
      console.error("Workflow Gen Error", error);
      throw new Error(error.message);
  }
};
