import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Phone, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [services, setServices] = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    service_id: '',
    date: null,
    time: ''
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchBusinessHours();
  }, []);

  useEffect(() => {
    if (formData.date && formData.service_id) {
      fetchAvailableSlots(format(formData.date, 'yyyy-MM-dd'));
    }
  }, [formData.date, formData.service_id]);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchBusinessHours = async () => {
    try {
      const response = await axios.get(`${API}/business-hours`);
      setBusinessHours(response.data);
    } catch (error) {
      console.error('Error fetching business hours:', error);
    }
  };

  const fetchAvailableSlots = async (date) => {
    try {
      const url = formData.service_id 
        ? `${API}/bookings/available-slots?date=${date}&service_id=${formData.service_id}`
        : `${API}/bookings/available-slots?date=${date}`;
      const response = await axios.get(url);
      setAvailableSlots(response.data.available_slots);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.phone || !formData.service_id || !formData.date || !formData.time) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/bookings`, {
        customer_name: formData.customer_name,
        phone: formData.phone,
        service_id: formData.service_id,
        date: format(formData.date, 'yyyy-MM-dd'),
        time: formData.time
      });
      
      toast.success('Agendamento realizado com sucesso! Entraremos em contato em breve.');
      
      // Send WhatsApp notification
      const booking = response.data;
      const service = services.find(s => s.id === formData.service_id);
      const whatsappNumber = booking.whatsapp_number || '+5588998376642';
      const message = encodeURIComponent(
        `🎉 *Novo Agendamento!*\n\n` +
        `👤 Cliente: ${formData.customer_name}\n` +
        `📱 Telefone: ${formData.phone}\n` +
        `💅 Serviço: ${service?.name}\n` +
        `📅 Data: ${format(formData.date, 'dd/MM/yyyy')}\n` +
        `🕐 Horário: ${formData.time}\n\n` +
        `Vitoria Lavor Beauty`
      );
      
      // Open WhatsApp in new tab
      window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
      
      setFormData({
        customer_name: '',
        phone: '',
        service_id: '',
        date: null,
        time: ''
      });
      setAvailableSlots([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao realizar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date) => {
    const dayOfWeek = date.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const hours = businessHours.find(h => h.day_of_week === adjustedDay);
    return !hours || !hours.is_open;
  };

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#FAF8F5] to-[#F5EDE4]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#E8D7C3_0%,_transparent_50%)]" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <img 
                src="https://customer-assets.emergentagent.com/job_eyelash-studio-5/artifacts/i7jun2yn_Marca%20d%20agua-06.png" 
                alt="Vitoria Lavor Beauty Logo" 
                className="w-48 h-48 object-contain"
              />
            </div>
            <div className="inline-flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-[#D4AF37] mr-2" />
              <span className="text-[#D4AF37] font-medium tracking-wider uppercase text-sm">Beauty & Elegance</span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-[#2D2D2D] mb-6 leading-tight">
              Vitoria Lavor Beauty
            </h1>
            <p className="text-lg sm:text-xl text-[#6B6B6B] max-w-2xl mx-auto mb-8 leading-relaxed">
              Especialista em design de cílios. Realce sua beleza natural com técnicas exclusivas e atendimento personalizado.
            </p>
            <Button 
              onClick={() => document.getElementById('booking').scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-white px-8 py-6 text-lg rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
              data-testid="hero-book-now-btn"
            >
              Agendar Agora
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white" id="services">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2D2D] mb-4">Nossos Serviços</h2>
            <p className="text-lg text-[#6B6B6B]">Técnicas profissionais para realçar seu olhar</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {services.map((service) => (
              <div 
                key={service.id} 
                className="group bg-gradient-to-br from-[#FAF8F5] to-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-[#E8D7C3]">
                <div className="aspect-[4/3] bg-gradient-to-br from-[#E8D7C3] to-[#D4AF37] relative overflow-hidden">
                  {service.image_url ? (
                    <img 
                      src={service.image_url} 
                      alt={service.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-16 h-16 text-white opacity-50" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl font-semibold text-[#2D2D2D] mb-3">{service.name}</h3>
                  <p className="text-[#6B6B6B] mb-4 leading-relaxed">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-[#D4AF37]">R$ {service.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-20 bg-gradient-to-br from-[#FAF8F5] to-white" id="booking">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2D2D] mb-4">Agende seu Horário</h2>
              <p className="text-lg text-[#6B6B6B]">Escolha o melhor horário para você</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 border border-[#E8D7C3]">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="customer_name" className="text-[#2D2D2D] font-medium mb-2 block">
                    <User className="inline w-4 h-4 mr-2" />
                    Nome Completo
                  </Label>
                  <Input
                    id="customer_name"
                    data-testid="booking-name-input"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    className="border-[#E8D7C3] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-xl"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-[#2D2D2D] font-medium mb-2 block">
                    <Phone className="inline w-4 h-4 mr-2" />
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    data-testid="booking-phone-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="border-[#E8D7C3] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-xl"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="service" className="text-[#2D2D2D] font-medium mb-2 block">
                    <Sparkles className="inline w-4 h-4 mr-2" />
                    Serviço
                  </Label>
                  <Select value={formData.service_id} onValueChange={(value) => setFormData({...formData, service_id: value})}>
                    <SelectTrigger className="border-[#E8D7C3] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-xl" data-testid="booking-service-select">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>{service.name} - R$ {service.price.toFixed(2)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[#2D2D2D] font-medium mb-2 block">
                    <Calendar className="inline w-4 h-4 mr-2" />
                    Data
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left border-[#E8D7C3] focus:border-[#D4AF37] rounded-xl"
                        data-testid="booking-date-picker"
                      >
                        {formData.date ? format(formData.date, 'PPP', { locale: ptBR }) : 'Selecione uma data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => setFormData({...formData, date, time: ''})}
                        disabled={isDateDisabled}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {formData.date && (
                  <div>
                    <Label htmlFor="time" className="text-[#2D2D2D] font-medium mb-2 block">
                      <Clock className="inline w-4 h-4 mr-2" />
                      Horário
                    </Label>
                    {availableSlots.length > 0 ? (
                      <Select value={formData.time} onValueChange={(value) => setFormData({...formData, time: value})}>
                        <SelectTrigger className="border-[#E8D7C3] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-xl" data-testid="booking-time-select">
                          <SelectValue placeholder="Selecione um horário" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-[#D4AF37] text-sm bg-[#FAF8F5] p-4 rounded-xl">Nenhum horário disponível para esta data</p>
                    )}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white py-6 text-lg rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                  data-testid="booking-submit-btn"
                >
                  {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Business Hours Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2D2D] mb-12">Horário de Funcionamento</h2>
            <div className="bg-gradient-to-br from-[#FAF8F5] to-white rounded-3xl shadow-lg p-8 border border-[#E8D7C3]">
              {businessHours.map((hours) => (
                <div key={hours.day_of_week} className="flex justify-between items-center py-4 border-b border-[#E8D7C3] last:border-0">
                  <span className="font-medium text-[#2D2D2D] text-lg">{dayNames[hours.day_of_week === 6 ? 0 : hours.day_of_week + 1]}</span>
                  <span className="text-[#6B6B6B] font-medium">
                    {hours.is_open ? `${hours.open_time} - ${hours.close_time}` : 'Fechado'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2D2D2D] text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="font-display text-3xl font-bold mb-4 text-[#D4AF37]">Vitoria Lavor Beauty</h3>
          <p className="text-[#E8D7C3]">Especialista em Design de Cílios</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;