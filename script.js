document.addEventListener('DOMContentLoaded', () => {
    const DOM = {
        temp: document.getElementById('temp-value'),
        desc: document.getElementById('weather-description'),
        icon: document.getElementById('weather-icon'),
        location: document.getElementById('location-name'),
        highLow: document.getElementById('temp-high-low'),
        precip: document.getElementById('precip-prob'),
        locationBtn: document.getElementById('location-btn'),
        errorMsg: document.getElementById('error-message')
    };

    // WMO Weather interpretation codes (Open-Meteo)
    const getWeatherDetails = (code) => {
        const codes = {
            0: { desc: '快晴', icon: 'clear_day', bg: 'weather-clear' },
            1: { desc: '晴れ', icon: 'partly_cloudy_day', bg: 'weather-clear' },
            2: { desc: '一部曇り', icon: 'cloud', bg: 'weather-cloudy' },
            3: { desc: '曇り', icon: 'cloud', bg: 'weather-cloudy' },
            45: { desc: '霧', icon: 'foggy', bg: 'weather-cloudy' },
            48: { desc: '霧氷', icon: 'foggy', bg: 'weather-snow' },
            51: { desc: '小雨', icon: 'rainy', bg: 'weather-rain' },
            53: { desc: '雨', icon: 'rainy', bg: 'weather-rain' },
            55: { desc: '大雨', icon: 'rainy', bg: 'weather-rain' },
            56: { desc: '弱い着氷性雨', icon: 'rainy_snow', bg: 'weather-snow' },
            57: { desc: '強い着氷性雨', icon: 'rainy_snow', bg: 'weather-snow' },
            61: { desc: '弱い雨', icon: 'rainy', bg: 'weather-rain' },
            63: { desc: '雨', icon: 'rainy', bg: 'weather-rain' },
            65: { desc: '強い雨', icon: 'rainy', bg: 'weather-rain' },
            66: { desc: '弱い着氷性雨', icon: 'rainy_snow', bg: 'weather-snow' },
            67: { desc: '強い着氷性雨', icon: 'rainy_snow', bg: 'weather-snow' },
            71: { desc: '小雪', icon: 'snowing', bg: 'weather-snow' },
            73: { desc: '雪', icon: 'snowing', bg: 'weather-snow' },
            75: { desc: '大雪', icon: 'snowing', bg: 'weather-snow' },
            77: { desc: '雪粒', icon: 'snowing', bg: 'weather-snow' },
            80: { desc: 'にわか雨', icon: 'rainy', bg: 'weather-rain' },
            81: { desc: '強いにわか雨', icon: 'rainy', bg: 'weather-rain' },
            82: { desc: '激しいにわか雨', icon: 'rainy', bg: 'weather-rain' },
            85: { desc: '雪', icon: 'snowing', bg: 'weather-snow' },
            86: { desc: '強い雪', icon: 'snowing', bg: 'weather-snow' },
            95: { desc: '雷雨', icon: 'thunderstorm', bg: 'weather-rain' },
            96: { desc: '雷雨とあられ', icon: 'thunderstorm', bg: 'weather-rain' },
            99: { desc: '激しい雷雨とあられ', icon: 'thunderstorm', bg: 'weather-rain' }
        };
        return codes[code] || { desc: '不明', icon: 'cloud', bg: 'weather-cloudy' };
    };

    const updateUI = (weatherData, locationName) => {
        const details = getWeatherDetails(weatherData.current.weather_code);

        // Update DOM elements with animation
        const animateValue = (element, start, end, duration) => {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                element.innerHTML = Math.floor(progress * (end - start) + start);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    element.innerHTML = Math.round(end); // Ensure exact final value
                }
            };
            window.requestAnimationFrame(step);
        };

        const targetTemp = weatherData.current.temperature_2m;
        animateValue(DOM.temp, 0, targetTemp, 1000);

        DOM.desc.textContent = details.desc;
        DOM.icon.textContent = details.icon;
        DOM.location.textContent = locationName;

        const maxTemp = Math.round(weatherData.daily.temperature_2m_max[0]);
        const minTemp = Math.round(weatherData.daily.temperature_2m_min[0]);
        DOM.highLow.textContent = `${maxTemp}° / ${minTemp}°`;

        DOM.precip.textContent = `${weatherData.daily.precipitation_probability_max[0]}%`;

        // Update background
        document.body.className = ''; // reset
        document.body.classList.add(details.bg);

        DOM.errorMsg.classList.add('hidden');
    };

    const fetchWeather = async (lat, lon, locationName) => {
        try {
            DOM.desc.textContent = '取得中...';
            // Open-Meteo API
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('API リクエストに失敗しました');
            const data = await response.json();

            updateUI(data, locationName);
        } catch (error) {
            console.error('Weather Fetch Error:', error);
            DOM.errorMsg.textContent = '天気データの取得に失敗しました。';
            DOM.errorMsg.classList.remove('hidden');
        }
    };

    const getLocationName = async (lat, lon) => {
        try {
            // Use Nominatim openstreetmap API for reverse geocoding (free, no key)
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
            const data = await response.json();

            if (data && data.address) {
                return data.address.city || data.address.town || data.address.village || data.address.county || data.address.state || "現在地";
            }
            return "現在地";
        } catch (e) {
            console.warn("Reverse geocoding failed", e);
            return "現在地";
        }
    };

    const handleGeolocationError = (error) => {
        let msg = '現在地の取得に失敗しました。';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                msg = "現在地取得が許可されていません。ブラウザの設定を確認してください。";
                break;
            case error.POSITION_UNAVAILABLE:
                msg = "現在地情報が利用できません。";
                break;
            case error.TIMEOUT:
                msg = "現在地の取得がタイムアウトしました。";
                break;
        }
        DOM.errorMsg.textContent = msg;
        DOM.errorMsg.classList.remove('hidden');
        DOM.desc.textContent = '取得失敗';

        // Fallback to Tokyo if completely failed
        fetchWeather(35.6895, 139.6917, '東京都 (デフォルト)');
    };

    const getCurrentLocation = () => {
        DOM.errorMsg.classList.add('hidden');
        DOM.desc.textContent = '位置情報を取得中...';

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const locName = await getLocationName(lat, lon);
                fetchWeather(lat, lon, locName);
            }, handleGeolocationError, {
                timeout: 10000,
                maximumAge: 60000
            });
        } else {
            handleGeolocationError({ code: 0, message: "Geolocation API not supported" });
        }
    };

    // Event listener for location button
    DOM.locationBtn.addEventListener('click', () => {
        // Add subtle rotation animation to button icon
        const icon = DOM.locationBtn.querySelector('.material-symbols-outlined');
        icon.style.transform = 'rotate(360deg)';
        icon.style.transition = 'transform 0.5s ease';
        setTimeout(() => { icon.style.transform = ''; icon.style.transition = ''; }, 500);

        getCurrentLocation();
    });

    // Initial load
    getCurrentLocation();
});
