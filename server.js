import express from 'express';
import multer from 'multer';
import { Storage } from 'megajs';
import cors from 'cors';

const app = express();
app.use(cors());

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// --- ВАШИ ДАННЫЕ ВПИСАНЫ СЮДА ---
const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;// Ваш пароль
// --------------------------------

// Проверка (теперь она не сработает, так как данные есть)
if (!MEGA_EMAIL || !MEGA_PASSWORD) {
  console.error('ОШИБКА: Не заданы переменные окружения MEGA_EMAIL и MEGA_PASSWORD');
  process.exit(1);
}

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не получен. Убедитесь, что поле называется "file".' });
  }

  console.log(`Получен файл: ${req.file.originalname}, размер: ${req.file.size} байт`);

  let storage;
  try {
    console.log('Подключение к MEGA...');
    storage = await new Storage({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD
    }).ready;
    console.log('Успешный вход в MEGA');

    console.log('Загрузка файла в MEGA...');
    const file = await storage.upload({
      name: req.file.originalname,
      size: req.file.size
    }, req.file.buffer).complete;
    console.log('Файл загружен, получение ссылки...');

    const downloadUrl = await file.link();
    console.log('Ссылка получена:', downloadUrl);

    res.json({ 
      url: downloadUrl,
      name: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    console.error('Ошибка при работе с MEGA:', error);
    res.status(500).json({ 
      error: 'Не удалось загрузить файл в MEGA',
      details: error.message 
    });
  } finally {
    if (storage) {
      try {
        await storage.close();
        console.log('Соединение с MEGA закрыто');
      } catch (closeError) {
        console.error('Ошибка при закрытии соединения:', closeError);
      }
    }
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Сервер загрузки в MEGA работает' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
