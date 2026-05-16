import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Video, MapPin, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { usePost } from '../contexts/PostContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories = [
  { label: 'Roads', value: 'roads' },
  { label: 'Water', value: 'water' },
  { label: 'Sanitation', value: 'sanitation' },
  { label: 'Electricity', value: 'electricity' },
  { label: 'Safety', value: 'safety' },
  { label: 'Other', value: 'other' },
];

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose }) => {
  const { createPost } = usePost();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [aiVerdict, setAiVerdict] = useState<'pending' | 'accepted' | 'rejected' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      
      // Determine media type
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      setMediaType(type);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Auto-detect location when modal opens
  useEffect(() => {
    if (isOpen && !coordinates) {
      detectLocation();
    }
  }, [isOpen]);

  const detectLocation = async () => {
    setIsDetectingLocation(true);
    
    console.log('[Location] Starting location detection...');
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsDetectingLocation(false);
      return;
    }

    // Check if running on localhost or HTTPS (required for geolocation)
    const isSecureContext = window.isSecureContext;
    if (!isSecureContext) {
      toast.error('Location detection requires HTTPS. Please use a secure connection.');
      setIsDetectingLocation(false);
      return;
    }

    try {
      // Check permission status first
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        console.log('[Location] Permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'denied') {
          toast.error('Location permission denied. Please enable it in your browser settings.');
          setIsDetectingLocation(false);
          return;
        }
      }

      // Get current position with high accuracy
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            
            console.log('[Location] ✅ GPS Position acquired:', {
              lat: latitude,
              lng: longitude,
              accuracy: `±${Math.round(accuracy)}m`,
              timestamp: new Date(position.timestamp).toISOString()
            });
            
            // Store coordinates
            setCoordinates({ lat: latitude, lng: longitude });
            
            // Reverse geocode to get address
            try {
              console.log('[Location] 🔍 Starting reverse geocoding...');
              
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                {
                  headers: {
                    'User-Agent': 'BolbhiduApp/1.0',
                    'Accept-Language': 'en'
                  }
                }
              );
              
              if (response.ok) {
                const data = await response.json();
                console.log('[Location] 📍 Full geocoding response:', data);
                
                const address = data.address;
                console.log('[Location] 🏘️ Address components:', {
                  suburb: address.suburb,
                  neighbourhood: address.neighbourhood,
                  city: address.city,
                  town: address.town,
                  village: address.village,
                  state: address.state,
                  country: address.country
                });
                
                // Build location string with comprehensive fallbacks
                const area = address.suburb || 
                           address.neighbourhood || 
                           address.quarter || 
                           address.residential ||
                           address.hamlet ||
                           address.locality;
                           
                const city = address.city || 
                           address.town || 
                           address.village || 
                           address.municipality ||
                           address.county;
                           
                const state = address.state || 
                            address.state_district || 
                            address.region;
                            
                const country = address.country;
                
                let detectedLocation = '';
                
                if (area && city) {
                  detectedLocation = `${area}, ${city}`;
                  if (state && state !== city) detectedLocation += `, ${state}`;
                } else if (city) {
                  detectedLocation = city;
                  if (state && state !== city) detectedLocation += `, ${state}`;
                } else if (area) {
                  detectedLocation = area;
                  if (state) detectedLocation += `, ${state}`;
                } else if (state && country) {
                  detectedLocation = `${state}, ${country}`;
                } else {
                  // Fallback to display name parts
                  const parts = data.display_name.split(',').map((s: string) => s.trim());
                  detectedLocation = parts.slice(0, Math.min(3, parts.length)).join(', ');
                }
                
                console.log('[Location] ✨ Final location string:', detectedLocation);
                console.log('[Location] 🏗️ Built from:', { area, city, state, country });
                
                if (detectedLocation && detectedLocation.trim()) {
                  setLocation(detectedLocation);
                  toast.success(
                    `📍 Location detected!`,
                    {
                      description: `${detectedLocation} (±${Math.round(accuracy)}m accuracy)`,
                      duration: 4000
                    }
                  );
                } else {
                  // Empty location string - use coordinates
                  const coordsLocation = `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`;
                  setLocation(coordsLocation);
                  console.warn('[Location] ⚠️ No address found, using coordinates');
                  toast.warning('Please verify your location', {
                    description: 'Using GPS coordinates as address',
                    duration: 5000
                  });
                }
              } else {
                console.error('[Location] ❌ Geocoding API error:', response.status);
                const coordsLocation = `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`;
                setLocation(coordsLocation);
                toast.warning('Using coordinates as location', {
                  description: 'Please enter a proper address',
                  duration: 5000
                });
              }
            } catch (geocodeError) {
              console.error('[Location] ❌ Geocoding failed:', geocodeError);
              const coordsLocation = `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`;
              setLocation(coordsLocation);
              toast.warning('Could not get address', {
                description: 'Please enter your location manually',
                duration: 5000
              });
            }
          } catch (error) {
            console.error('[Location] ❌ Processing error:', error);
            toast.error('Failed to process location data');
          } finally {
            setIsDetectingLocation(false);
          }
        },
        (error) => {
          console.error('[Location] ❌ Geolocation error:', {
            code: error.code,
            message: error.message
          });
          
          let errorMessage = 'Failed to detect location';
          let description = 'Please enter manually';
          
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = 'Location access denied';
              description = 'Enable location in browser settings';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = 'Location unavailable';
              description = 'Check GPS/network connection';
              break;
            case 3: // TIMEOUT
              errorMessage = 'Location request timed out';
              description = 'Taking too long, try again';
              break;
          }
          
          toast.error(errorMessage, { description, duration: 5000 });
          setIsDetectingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error('[Location] ❌ Detection setup error:', error);
      toast.error('Failed to initialize location detection');
      setIsDetectingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is suspended
    if (user?.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      const daysRemaining = Math.ceil(
        (new Date(user.suspendedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      toast.error(`Your account is suspended for ${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''} due to multiple invalid posts.`);
      return;
    }

    if (!description.trim() || !category || !location.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (!coordinates) {
      toast.error('Location not detected. Please allow location access and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaUrl = '';
      
      // Upload media if exists
      if (mediaFile) {
        const uploadResult = mediaType === 'image' 
          ? await apiService.upload.image(mediaFile)
          : await apiService.upload.video(mediaFile);
        mediaUrl = uploadResult.data.url;
      }

      // Create post
      toast.info('Creating post...');
      
      await createPost({
        userId: user!.id,
        username: user!.name,
        userAvatar: user!.avatar || '',
        userEmail: user!.email,
        description: description.trim(),
        category,
        location: location.trim(),
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType || undefined,
        // Include actual coordinates from GPS detection
        lat: coordinates.lat,
        lng: coordinates.lng,
      });

      toast.success('Post created! AI is verifying...');
      
      // Reset form
      setDescription('');
      setCategory('');
      setLocation('');
      setCoordinates(null);
      removeMedia();
      setAiVerdict(null);
      onClose();
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            Share what's happening in your community and help make it better.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="What's happening in your community?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <div className="text-sm text-muted-foreground text-right">
              {description.length}/500
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-4">
            <Label>Media (Optional)</Label>
            
            {!mediaPreview && (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex space-x-4">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop or click to upload
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Support: JPG, PNG, MP4, MOV (Max 50MB)
                  </p>
                </div>
              </div>
            )}

            {mediaPreview && (
              <div className="relative">
                {mediaType === 'image' ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full max-h-80 object-cover rounded-xl"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full max-h-80 rounded-xl"
                  />
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="location">Detected Location *</Label>
              {isDetectingLocation && (
                <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Detecting...
                </span>
              )}
              {coordinates && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Detected
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <Input
                id="location"
                value={location || 'Detecting your location...'}
                readOnly
                className="flex-1 bg-muted"
                disabled={isDetectingLocation}
              />
              {!isDetectingLocation && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={detectLocation}
                  title="Retry location detection"
                  size="icon"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              )}
            </div>
            {coordinates ? (
              <div className="space-y-1 bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1 font-medium">
                  <MapPin className="h-3 w-3" />
                  GPS Coordinates: {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ℹ️ Location is auto-detected for accurate nearby posts
                </p>
              </div>
            ) : !isDetectingLocation ? (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Location detection failed.</strong> Please click the <MapPin className="inline h-3 w-3" /> button to retry, or enable location permissions in your browser.
                </p>
              </div>
            ) : null}
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Post'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;