import axios from 'axios';
import { API_BASE_URL } from '../config';

export async function chatWithAssistant(messages) {
  const payload = {
    messages: (messages || []).map(m => ({ role: m.role, content: m.content }))
  };
  const res = await axios.post(`${API_BASE_URL}/ai/chat`, payload);
  return res.data?.text || '';
}
