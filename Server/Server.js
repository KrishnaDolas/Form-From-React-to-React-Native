import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './Config/db.js';
import templateRoutes from './Routes/templateRoutes.js';
import responseRoutes from './Routes/responseRoutes.js';
import uploadRoutes from './Routes/uploadRoutes.js';
import path from 'path';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// serve uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// DB connect
connectDB();

// Routes
app.get('/', (req, res) => res.send('API is running...'));
app.use('/api/templates', templateRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/uploads', uploadRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
