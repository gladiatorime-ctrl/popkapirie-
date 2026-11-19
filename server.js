import express from 'express';
import multer from 'multer';
import { Storage } from 'megajs';
import cors from 'cors';

const app = express();

// Разрешаем запросы с вашего сайта (для теста можно разрешить все)
app.use(cors());

// Настраиваем multer для приёма файлов в память (буфер)
// Ограничение размера файла — 100 МБ (можно изменить)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

// Данные для входа в MEGA берутся из переменных окружения Render
const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

// Проверка, что переменные заданы (чтобы сервер не падал молча)
if (!MEGA_EMAIL || !MEGA_PASSWORD) {
  console.error('ОШИБКА: Не заданы переменные окружения MEGA_EMAIL и MEGA_PASSWORD');
  process.exit(1);
}

// Эндпоинт для загрузки файла
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не получен. Убедитесь, что поле называется "file".' });
  }

  console.log(`Получен файл: ${req.file.originalname}, размер: ${req.file.size} байт`);

  let storage;
  try {
    // 1. Логинимся в MEGA
    console.log('Подключение к MEGA...');
    storage = await new Storage({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD
    }).ready;
    console.log('Успешный вход в MEGA');

    // 2. Загружаем файл
    console.log('Загрузка файла в MEGA...');
    const file = await storage.upload({
      name: req.file.originalname,
      size: req.file.size // Обязательно указываем размер!
    }, req.file.buffer).complete;
    console.log('Файл загружен, получение ссылки...');

    // 3. Получаем публичную ссылку на файл
    const downloadUrl = await file.link();
    console.log('Ссылка получена:', downloadUrl);

    // 4. Возвращаем ответ клиенту
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
    // 5. Закрываем соединение с MEGA (всегда, даже при ошибке)
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

// Простой health-check эндпоинт (чтобы Render видел, что сервер жив)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Сервер загрузки в MEGA работает' });
});

// Запуск сервера на порту, который передаёт Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
