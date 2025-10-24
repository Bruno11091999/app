import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, LogOut, Settings, Sparkles, Upload, Edit, Trash2, Check, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({ name: '', description: '', price: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }
    fetchData();
  }, [navigate]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
  });

  const fetchData = async () => {
    try {
      const [bookingsRes, servicesRes, hoursRes] = await Promise.all([
        axios.get(`${API}/bookings`, getAuthHeaders()),
        axios.get(`${API}/services?active_only=false`, getAuthHeaders()),
        axios.get(`${API}/business-hours`, getAuthHeaders())
      ]);
      setBookings(bookingsRes.data);
      setServices(servicesRes.data);
      setBusinessHours(hoursRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
      toast.error('Erro ao carregar dados');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status?status=${status}`, {}, getAuthHeaders());
      toast.success('Status atualizado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleImageUpload = async (file, serviceId = null) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload-image`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (serviceId) {
        await axios.put(`${API}/services/${serviceId}`, 
          { image_url: response.data.image_url },
          getAuthHeaders()
        );
        toast.success('Imagem atualizada!');
        fetchData();
      } else if (editingService) {
        setEditingService({...editingService, image_url: response.data.image_url});
      } else {
        setNewService({...newService, image_url: response.data.image_url});
      }
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const createService = async () => {
    if (!newService.name || !newService.description || !newService.price) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      await axios.post(`${API}/services`, {
        ...newService,
        price: parseFloat(newService.price)
      }, getAuthHeaders());
      toast.success('Serviço criado!');
      setNewService({ name: '', description: '', price: '', image_url: null });
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar serviço');
    }
  };

  const updateService = async () => {
    try {
      const updateData = { ...editingService };
      if (updateData.price) {
        updateData.price = parseFloat(updateData.price);
      }
      await axios.put(`${API}/services/${editingService.id}`, updateData, getAuthHeaders());
      toast.success('Serviço atualizado!');
      setEditingService(null);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar serviço');
    }
  };

  const deleteService = async (serviceId) => {
    if (!window.confirm('Deseja realmente excluir este serviço?')) return;
    
    try {
      await axios.delete(`${API}/services/${serviceId}`, getAuthHeaders());
      toast.success('Serviço excluído!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir serviço');
    }
  };

  const updateBusinessHours = async (dayOfWeek, data) => {
    try {
      await axios.put(`${API}/business-hours/${dayOfWeek}`, data, getAuthHeaders());
      toast.success('Horário atualizado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar horário');
    }
  };

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  const statusLabels = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#FAF8F5] to-[#F5EDE4]">
      <header className="bg-white border-b border-[#E8D7C3] shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="font-display text-3xl font-bold text-[#2D2D2D]">Painel Administrativo</h1>
          <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto mb-8 bg-white border border-[#E8D7C3] rounded-xl p-1">
            <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white" data-testid="tab-bookings">
              <Calendar className="w-4 h-4 mr-2" />
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-lg data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white" data-testid="tab-services">
              <Sparkles className="w-4 h-4 mr-2" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="hours" className="rounded-lg data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white" data-testid="tab-hours">
              <Clock className="w-4 h-4 mr-2" />
              Horários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" data-testid="bookings-content">
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-[#E8D7C3]">
              <h2 className="font-display text-3xl font-bold text-[#2D2D2D] mb-6">Agendamentos</h2>
              <div className="space-y-4">
                {bookings.length === 0 ? (
                  <p className="text-center text-[#6B6B6B] py-8">Nenhum agendamento encontrado</p>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className="bg-[#FAF8F5] rounded-2xl p-6 border border-[#E8D7C3]">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <h3 className="font-semibold text-lg text-[#2D2D2D]">{booking.customer_name}</h3>
                          <p className="text-[#6B6B6B]">📞 {booking.phone}</p>
                          <p className="text-[#D4AF37] font-medium mt-2">{booking.service_name}</p>
                          <p className="text-[#6B6B6B] text-sm">📅 {booking.date} às {booking.time}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[booking.status]}`}>
                            {statusLabels[booking.status]}
                          </span>
                          {booking.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                className="bg-green-500 hover:bg-green-600 text-white"
                                data-testid={`confirm-booking-${booking.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                className="bg-red-500 hover:bg-red-600 text-white"
                                data-testid={`cancel-booking-${booking.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="services" data-testid="services-content">
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-[#E8D7C3]">
              <h2 className="font-display text-3xl font-bold text-[#2D2D2D] mb-6">Gerenciar Serviços</h2>
              
              {/* Add New Service */}
              <div className="bg-[#FAF8F5] rounded-2xl p-6 mb-6 border border-[#E8D7C3]">
                <h3 className="font-semibold text-xl text-[#2D2D2D] mb-4">Novo Serviço</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#2D2D2D] mb-2 block">Nome</Label>
                    <Input
                      value={newService.name}
                      onChange={(e) => setNewService({...newService, name: e.target.value})}
                      placeholder="Nome do serviço"
                      className="border-[#E8D7C3] rounded-xl"
                      data-testid="new-service-name"
                    />
                  </div>
                  <div>
                    <Label className="text-[#2D2D2D] mb-2 block">Preço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newService.price}
                      onChange={(e) => setNewService({...newService, price: e.target.value})}
                      placeholder="0.00"
                      className="border-[#E8D7C3] rounded-xl"
                      data-testid="new-service-price"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-[#2D2D2D] mb-2 block">Descrição</Label>
                    <Input
                      value={newService.description}
                      onChange={(e) => setNewService({...newService, description: e.target.value})}
                      placeholder="Descrição do serviço"
                      className="border-[#E8D7C3] rounded-xl"
                      data-testid="new-service-description"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-[#2D2D2D] mb-2 block">Imagem</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
                      className="border-[#E8D7C3] rounded-xl"
                      disabled={uploadingImage}
                      data-testid="new-service-image"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button 
                      onClick={createService}
                      className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white rounded-xl"
                      data-testid="create-service-btn"
                    >
                      Adicionar Serviço
                    </Button>
                  </div>
                </div>
              </div>

              {/* Services List */}
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.id} className="bg-[#FAF8F5] rounded-2xl p-6 border border-[#E8D7C3]">
                    <div className="flex flex-wrap gap-4 items-start">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-[#E8D7C3] to-[#D4AF37] flex-shrink-0">
                        {service.image_url ? (
                          <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <h3 className="font-semibold text-xl text-[#2D2D2D]">{service.name}</h3>
                        <p className="text-[#6B6B6B] mt-1">{service.description}</p>
                        <p className="text-[#D4AF37] font-bold text-lg mt-2">R$ {service.price.toFixed(2)}</p>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs ${service.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {service.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setEditingService(service)}
                              className="bg-[#D4AF37] hover:bg-[#B8941F] text-white"
                              data-testid={`edit-service-${service.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Editar Serviço</DialogTitle>
                            </DialogHeader>
                            {editingService && (
                              <div className="space-y-4 mt-4">
                                <div>
                                  <Label>Nome</Label>
                                  <Input
                                    value={editingService.name}
                                    onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                                    className="border-[#E8D7C3] rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label>Descrição</Label>
                                  <Input
                                    value={editingService.description}
                                    onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                                    className="border-[#E8D7C3] rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label>Preço (R$)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingService.price}
                                    onChange={(e) => setEditingService({...editingService, price: e.target.value})}
                                    className="border-[#E8D7C3] rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <Select 
                                    value={editingService.active.toString()} 
                                    onValueChange={(value) => setEditingService({...editingService, active: value === 'true'})}
                                  >
                                    <SelectTrigger className="border-[#E8D7C3] rounded-xl">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">Ativo</SelectItem>
                                      <SelectItem value="false">Inativo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Imagem</Label>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
                                    className="border-[#E8D7C3] rounded-xl"
                                    disabled={uploadingImage}
                                  />
                                </div>
                                <Button 
                                  onClick={updateService}
                                  className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white rounded-xl"
                                >
                                  Salvar Alterações
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          onClick={() => deleteService(service.id)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                          data-testid={`delete-service-${service.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hours" data-testid="hours-content">
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-[#E8D7C3]">
              <h2 className="font-display text-3xl font-bold text-[#2D2D2D] mb-6">Horários de Funcionamento</h2>
              <div className="space-y-4">
                {businessHours.map((hours) => {
                  const dayIndex = hours.day_of_week === 6 ? 0 : hours.day_of_week + 1;
                  return (
                    <div key={hours.id} className="bg-[#FAF8F5] rounded-2xl p-6 border border-[#E8D7C3]">
                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[150px]">
                          <h3 className="font-semibold text-lg text-[#2D2D2D]">{dayNames[dayIndex]}</h3>
                        </div>
                        <div className="flex items-center gap-4">
                          <Select 
                            value={hours.is_open.toString()} 
                            onValueChange={(value) => updateBusinessHours(hours.day_of_week, { is_open: value === 'true' })}
                          >
                            <SelectTrigger className="w-32 border-[#E8D7C3] rounded-xl" data-testid={`day-status-${hours.day_of_week}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Aberto</SelectItem>
                              <SelectItem value="false">Fechado</SelectItem>
                            </SelectContent>
                          </Select>
                          {hours.is_open && (
                            <>
                              <Input
                                type="time"
                                value={hours.open_time}
                                onChange={(e) => updateBusinessHours(hours.day_of_week, { is_open: true, open_time: e.target.value })}
                                className="w-32 border-[#E8D7C3] rounded-xl"
                                data-testid={`day-open-${hours.day_of_week}`}
                              />
                              <span className="text-[#6B6B6B]">até</span>
                              <Input
                                type="time"
                                value={hours.close_time}
                                onChange={(e) => updateBusinessHours(hours.day_of_week, { is_open: true, close_time: e.target.value })}
                                className="w-32 border-[#E8D7C3] rounded-xl"
                                data-testid={`day-close-${hours.day_of_week}`}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;