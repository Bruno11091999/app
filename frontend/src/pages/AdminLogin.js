import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, credentials);
      localStorage.setItem('admin_token', response.data.access_token);
      toast.success('Login realizado com sucesso!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#FAF8F5] to-[#F5EDE4] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-[#2D2D2D] mb-2">Vitoria Lavor Beauty</h1>
          <p className="text-[#6B6B6B]">Painel Administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 border border-[#E8D7C3]">
          <div className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-[#2D2D2D] font-medium mb-2 block">
                <User className="inline w-4 h-4 mr-2" />
                Usuário
              </Label>
              <Input
                id="username"
                data-testid="admin-username-input"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="border-[#E8D7C3] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-xl"
                placeholder="Digite seu usuário"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-[#2D2D2D] font-medium mb-2 block">
                <Lock className="inline w-4 h-4 mr-2" />
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                data-testid="admin-password-input"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="border-[#E8D7C3] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-xl"
                placeholder="Digite sua senha"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white py-6 text-lg rounded-xl transition-all duration-300"
              data-testid="admin-login-btn"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </div>
        </form>

        <div className="text-center mt-6">
          <Button 
            variant="link" 
            onClick={() => navigate('/')}
            className="text-[#D4AF37] hover:text-[#B8941F]"
            data-testid="back-home-btn"
          >
            Voltar para o site
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;