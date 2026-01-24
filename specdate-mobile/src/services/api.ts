import axios from 'axios';
import Constants from 'expo-constants';

// Replace with your local IP if running on device (e.g., http://192.168.1.5:8000/api)
// For emulator 10.0.2.2 usually maps to localhost
const API_URL = 'http://10.0.2.2:8000/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add interceptor for tokens later
