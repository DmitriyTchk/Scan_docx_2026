export const APP_NAME = "VoiceTable AI";

export const TRANSLATIONS = {
  en: {
    scanTable: "Scan Table",
    scanDesc: "Photo to Spreadsheet",
    uploadFile: "Upload File",
    uploadDesc: "CSV or Image",
    newTemplate: "New Template",
    newDesc: "Start from scratch",
    history: "View History",
    processing: "Processing...",
    guideTitle: "Workflow Guide",
    guideDesc: "Define the walking path for data entry.",
    genButton: "Generate Pipeline",
    startGuide: "Start Guided Mode",
    savePipeline: "Save Pipeline",
    editPipeline: "Edit Pipeline",
    step: "Step",
    instruction: "Instruction",
  },
  ru: {
    scanTable: "Сканировать",
    scanDesc: "Фото в таблицу",
    uploadFile: "Загрузить",
    uploadDesc: "CSV или Фото",
    newTemplate: "Новый шаблон",
    newDesc: "Создать с нуля",
    history: "История",
    processing: "Обработка...",
    guideTitle: "Маршрут обхода",
    guideDesc: "Настройте порядок заполнения ячеек.",
    genButton: "Создать маршрут",
    startGuide: "Начать обход",
    savePipeline: "Сохранить маршрут",
    editPipeline: "Изменить маршрут",
    step: "Шаг",
    instruction: "Инструкция",
  }
};

export const SAMPLE_COLUMNS = [
  { id: 'col_1', label: 'Item', type: 'text' },
  { id: 'col_2', label: 'Quantity', type: 'number' },
  { id: 'col_3', label: 'Price', type: 'number' },
  { id: 'col_4', label: 'Status', type: 'text' },
] as const;
