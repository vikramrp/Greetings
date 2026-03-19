import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, Briefcase, Phone, Image as ImageIcon, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileFormProps {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initialProfile,
  onSave,
}) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photoURL' | 'logoURL') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
      <h2 className="text-2xl font-semibold text-white mb-4">Your Profile</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60 flex items-center gap-2">
            <User size={16} /> Name
          </label>
          <input
            type="text"
            name="name"
            value={profile.name}
            onChange={handleChange}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            placeholder="Enter your name"
          />
        </div>

        {/* Designation */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60 flex items-center gap-2">
            <Briefcase size={16} /> Designation
          </label>
          <input
            type="text"
            name="designation"
            value={profile.designation || ''}
            onChange={handleChange}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            placeholder="e.g. Political Worker, CEO"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60 flex items-center gap-2">
            <Phone size={16} /> Phone Number
          </label>
          <input
            type="text"
            name="phone"
            value={profile.phone || ''}
            onChange={handleChange}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            placeholder="Enter your phone number"
          />
        </div>

        {/* Photos */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60 flex items-center gap-2">
              <ImageIcon size={16} /> Profile Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'photoURL')}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="cursor-pointer flex items-center justify-center w-full aspect-video bg-white/5 border-2 border-dashed border-white/20 rounded-xl hover:bg-white/10 transition-all overflow-hidden"
            >
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/40 text-sm">Upload Photo</span>
              )}
            </label>
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60 flex items-center gap-2">
              <ImageIcon size={16} /> Business Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'logoURL')}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className="cursor-pointer flex items-center justify-center w-full aspect-video bg-white/5 border-2 border-dashed border-white/20 rounded-xl hover:bg-white/10 transition-all overflow-hidden"
            >
              {profile.logoURL ? (
                <img src={profile.logoURL} alt="Logo" className="w-full h-full object-contain p-4" />
              ) : (
                <span className="text-white/40 text-sm">Upload Logo</span>
              )}
            </label>
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSave(profile)}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <Check size={20} /> Save Profile
      </motion.button>
    </div>
  );
};
