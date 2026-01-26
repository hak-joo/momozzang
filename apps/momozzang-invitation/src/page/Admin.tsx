import { useState, useEffect } from 'react';
import { supabase } from '@momozzang/ui/src/shared/lib/supabase';
import { useInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/hooks/useInvitation';
import { getInvitationRepository } from '@momozzang/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory';
import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';

function AdminPage() {
  const [slug, setSlug] = useState('demo-captain-luna');
  const [loadSlug, setLoadSlug] = useState('demo-captain-luna');
  const { invitation, loading, error } = useInvitation(loadSlug);
  const [formData, setFormData] = useState<WeddingInvitation | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invitation) {
      setFormData(invitation);
    }
  }, [invitation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
  };

  const handleLoadClick = () => {
    setLoadSlug(slug);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('wedding-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('wedding-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleImageUpload = async (file: File, field: 'mainImageUrl' | 'brideImageUrl' | 'groomImageUrl' | 'shareImageUrl') => {
    if (!formData) return;

    try {
      setUploading(true);
      const publicUrl = await uploadImage(file);
      
      const newData = { ...formData };
      
      if (field === 'mainImageUrl') {
        if (!newData.customization) newData.customization = {} as any;
        newData.customization!.mainImageUrl = publicUrl;
      } else if (field === 'shareImageUrl') {
        if (!newData.invitationInfo) newData.invitationInfo = {} as any;
        newData.invitationInfo.shareImageUrl = publicUrl;
      } else if (field === 'brideImageUrl') {
        if (!newData.aboutUs) newData.aboutUs = {} as any;
        newData.aboutUs!.brideImageUrl = publicUrl;
      } else if (field === 'groomImageUrl') {
        if (!newData.aboutUs) newData.aboutUs = {} as any;
        newData.aboutUs!.groomImageUrl = publicUrl;
      }

      setFormData(newData);
      alert('Image uploaded successfully! Remember to Save.');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };
  
  const handleSave = async () => {
    if (!formData) return;
    try {
      setSaving(true);
      const repo = getInvitationRepository();
      await repo.updateInvitation(loadSlug, formData);
      alert('Saved successfully!');
    } catch (error) {
      console.error('Error saving invitation:', error);
      alert('Error saving invitation');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !formData) return <div>Loading...</div>;
  if (error) return <div>Error loading: {error.message}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Invitation Admin</h1>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={slug} 
          onChange={handleInputChange} 
          placeholder="Enter slug" 
          style={{ padding: '8px', flexGrow: 1 }}
        />
        <button onClick={handleLoadClick} style={{ padding: '8px 16px' }}>Load</button>
      </div>

      {formData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Image */}
          <section style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
            <h3>Main Image</h3>
            {formData.customization?.mainImageUrl && (
              <img src={formData.customization.mainImageUrl} alt="Main" style={{ width: '100px', height: '100px', objectFit: 'cover', display: 'block', marginBottom: '10px' }} />
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], 'mainImageUrl')} 
              disabled={uploading}
            />
          </section>

          {/* Share Image */}
          <section style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
            <h3>Share Thumbnail</h3>
            {formData.invitationInfo?.shareImageUrl && (
              <img src={formData.invitationInfo.shareImageUrl} alt="Share" style={{ width: '100px', height: '100px', objectFit: 'cover', display: 'block', marginBottom: '10px' }} />
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], 'shareImageUrl')} 
              disabled={uploading}
            />
          </section>

          {/* Bride & Groom Images */}
          <section style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
            <h3>Example Couple Images (About Us)</h3>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <h4>Groom</h4>
                {formData.aboutUs?.groomImageUrl && (
                   <img src={formData.aboutUs.groomImageUrl} alt="Groom" style={{ width: '100px', height: '100px', objectFit: 'cover', display: 'block', marginBottom: '10px' }} />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], 'groomImageUrl')} 
                  disabled={uploading}
                />
              </div>
              <div>
                <h4>Bride</h4>
                {formData.aboutUs?.brideImageUrl && (
                   <img src={formData.aboutUs.brideImageUrl} alt="Bride" style={{ width: '100px', height: '100px', objectFit: 'cover', display: 'block', marginBottom: '10px' }} />
                )}
                 <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], 'brideImageUrl')} 
                  disabled={uploading}
                />
              </div>
            </div>
          </section>

          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={handleSave} 
              disabled={saving || uploading}
              style={{ 
                padding: '12px 24px', 
                fontSize: '16px', 
                backgroundColor: '#0070f3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export default AdminPage;
