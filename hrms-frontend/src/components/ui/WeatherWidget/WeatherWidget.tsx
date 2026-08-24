import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Loader2 } from 'lucide-react';
import axios from 'axios';

interface WeatherData {
  temp: number;
  description: string;
  iconType: string;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem('weather_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Use cache if it's less than 1 hour old
        if (Date.now() - parsed.time < 3600000) {
          setWeather(parsed.data);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    const fetchWeather = async (lat?: number, lon?: number) => {
      try {
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
        if (!apiKey) {
          console.warn('VITE_OPENWEATHER_API_KEY is not defined');
          setLoading(false);
          return;
        }

        let url = `https://api.openweathermap.org/data/2.5/weather?q=Hanoi,vn&units=metric&appid=${apiKey}&lang=vi`;
        if (lat && lon) {
          url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}&lang=vi`;
        }

        const response = await axios.get(url);

        const data = response.data;
        const newWeather = {
          temp: Math.round(data.main.temp),
          description: data.weather[0].description,
          iconType: data.weather[0].main
        };
        setWeather(newWeather);
        localStorage.setItem('weather_cache', JSON.stringify({ data: newWeather, time: Date.now() }));
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoading(false);
      }
    };

    const cachedGps = localStorage.getItem('gps_cache');
    let cachedLat: number | undefined;
    let cachedLon: number | undefined;

    if (cachedGps) {
      try {
        const parsedGps = JSON.parse(cachedGps);
        cachedLat = parsedGps.lat;
        cachedLon = parsedGps.lon;
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (cachedLat && cachedLon) {
      // Fetch immediately using cached GPS
      fetchWeather(cachedLat, cachedLon);
      
      // Update GPS silently in background
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            localStorage.setItem('gps_cache', JSON.stringify({ lat: position.coords.latitude, lon: position.coords.longitude }));
          },
          () => {},
          { timeout: 5000, maximumAge: 300000 }
        );
      }
    } else {
      // First time or no cached GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            localStorage.setItem('gps_cache', JSON.stringify({ lat: position.coords.latitude, lon: position.coords.longitude }));
            fetchWeather(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.warn('Geolocation error or denied, using default location:', error);
            fetchWeather(); // Fallback to Hanoi
          },
          { timeout: 3000, maximumAge: 300000 }
        );
      } else {
        fetchWeather();
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-sec bg-surface border border-border px-3 py-1.5 rounded-full shadow-sm">
        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
        <span>Đang tải thời tiết...</span>
      </div>
    );
  }

  if (!weather) return null;

  const renderIcon = () => {
    switch (weather.iconType.toLowerCase()) {
      case 'clear':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'clouds':
        return <Cloud className="w-5 h-5 text-gray-400" />;
      case 'rain':
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      case 'snow':
        return <CloudSnow className="w-5 h-5 text-sky-200" />;
      case 'thunderstorm':
        return <CloudLightning className="w-5 h-5 text-purple-500" />;
      case 'drizzle':
        return <CloudDrizzle className="w-5 h-5 text-blue-300" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-text-primary bg-surface border border-border px-3 py-1.5 rounded-full shadow-sm">
      {renderIcon()}
      <span className="font-medium">{weather.temp}°C</span>
      <span className="text-text-sec capitalize hidden sm:inline">- {weather.description}</span>
    </div>
  );
}
