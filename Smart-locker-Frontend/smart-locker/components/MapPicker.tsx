'use client'

import { useState, useCallback, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Locate, Search } from "lucide-react"

interface MapPickerProps {
  latitude: string
  longitude: string
  onLocationSelect: (lat: string, lng: string) => void
}

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px'
}

// ค่าเริ่มต้น - ประเทศไทย
const defaultCenter = {
  lat: 13.7563,
  lng: 100.5018
}

export default function MapPicker({ latitude, longitude, onLocationSelect }: MapPickerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  // ตั้งค่า marker จาก props ถ้ามีค่าอยู่แล้ว
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      if (!isNaN(lat) && !isNaN(lng)) {
        setMarkerPosition({ lat, lng })
      }
    }
  }, [latitude, longitude])

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
    
    // ถ้ามีค่า lat/lng อยู่แล้ว ให้ center ไปที่นั่น
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setCenter({ lat, lng })
        map.setZoom(15)
      }
    }
  }, [latitude, longitude])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // เมื่อคลิกบนแผนที่
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      
      setMarkerPosition({ lat, lng })
      onLocationSelect(lat.toFixed(6), lng.toFixed(6))
    }
  }, [onLocationSelect])

  // ค้นหาสถานที่
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !map) return

    setIsSearching(true)
    setSearchError(null)

    try {
      const geocoder = new google.maps.Geocoder()
      
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location
          const lat = location.lat()
          const lng = location.lng()

          map.setCenter({ lat, lng })
          map.setZoom(15)
          
          setMarkerPosition({ lat, lng })
          onLocationSelect(lat.toFixed(6), lng.toFixed(6))
        } else {
          setSearchError('ไม่พบสถานที่ที่ค้นหา')
        }
        setIsSearching(false)
      })
    } catch (error) {
      setSearchError('เกิดข้อผิดพลาดในการค้นหา')
      setIsSearching(false)
    }
  }, [searchQuery, map, onLocationSelect])

  // ใช้ตำแหน่งปัจจุบัน
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setSearchError('เบราว์เซอร์ไม่รองรับ Geolocation')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        setMarkerPosition({ lat, lng })
        onLocationSelect(lat.toFixed(6), lng.toFixed(6))

        if (map) {
          map.setCenter({ lat, lng })
          map.setZoom(15)
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setSearchError('กรุณาอนุญาตการเข้าถึงตำแหน่ง')
            break
          case error.POSITION_UNAVAILABLE:
            setSearchError('ไม่สามารถระบุตำแหน่งได้')
            break
          default:
            setSearchError('เกิดข้อผิดพลาดในการระบุตำแหน่ง')
        }
      }
    )
  }, [map, onLocationSelect])

  // แสดง error ถ้าโหลด API ไม่ได้
  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">
          ไม่สามารถโหลด Google Maps ได้ กรุณาตรวจสอบ API Key
        </p>
      </div>
    )
  }

  // แสดง loading
  if (!isLoaded) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center" style={{ height: '300px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-800 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">กำลังโหลดแผนที่...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหาสถานที่ เช่น โรงพยาบาล, ถนน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? 'กำลังค้นหา...' : 'ค้นหา'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleUseCurrentLocation}
          title="ใช้ตำแหน่งปัจจุบัน"
        >
          <Locate className="h-4 w-4" />
        </Button>
      </div>

      {searchError && (
        <p className="text-red-500 text-sm">{searchError}</p>
      )}

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={markerPosition || defaultCenter}
        zoom={markerPosition ? 15 : 6}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {markerPosition && (
          <Marker 
            position={markerPosition}
            animation={google.maps.Animation.DROP}
          />
        )}
      </GoogleMap>

      {/* แสดงค่าพิกัดที่เลือก */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">พิกัดที่เลือก:</span>
          {markerPosition ? (
            <span className="font-mono text-gray-900">
              {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
            </span>
          ) : (
            <span className="text-gray-400">คลิกบนแผนที่เพื่อเลือกตำแหน่ง</span>
          )}
        </div>
      </div>
    </div>
  )
}