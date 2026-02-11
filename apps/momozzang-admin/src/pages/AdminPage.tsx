import { useState, useEffect } from 'react';
import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Box } from '@momozzang/ui/src/shared/ui/Box/Box';
import { GalleryManager } from '../widgets/GalleryManager/GalleryManager';
import { InvitationProvider } from '@momozzang/ui/src/entities/WeddingInvitation/Context';
import styles from './AdminPage.module.css';
import { clsx } from 'clsx';
import { useInvitationQuery } from '../features/invitation/api/useInvitationQuery';
import { useInvitationMutation } from '../features/invitation/api/useInvitationMutation';
import { useImageUploadMutation } from '../features/invitation/api/useImageUploadMutation';

export default function AdminPage() {
  const [slug, setSlug] = useState('demo-captain-luna');

  const {
    data: fetchedInvitation,
    isPending: isLoadingQuery,
    isError,
    error,
  } = useInvitationQuery(slug);
  const { mutate: saveInvitation, isPending: isSaving } = useInvitationMutation();
  const { mutateAsync: uploadImage, isPending: isUploading } = useImageUploadMutation();

  const [invitation, setInvitation] = useState<WeddingInvitation | null>(null);

  useEffect(() => {
    if (fetchedInvitation) {
      setInvitation(fetchedInvitation);
    } else if (isError) {
      setInvitation(null);
    }
  }, [fetchedInvitation, isError]);

  const handleSave = () => {
    if (!invitation) return;
    saveInvitation(
      { slug, data: invitation },
      {
        onSuccess: () => alert('Saved successfully!'),
        onError: (e) => {
          console.error(e);
          alert('Error saving invitation');
        },
      },
    );
  };

  const handleSingleUpload = async (file: File, field: 'main' | 'share' | 'bride' | 'groom') => {
    if (!invitation) return;
    try {
      const url = await uploadImage(file);
      const newData = { ...invitation };

      if (field === 'main') {
        if (!newData.customization) newData.customization = {} as any;
        newData.customization!.mainImageUrl = url;
      } else if (field === 'share') {
        if (!newData.invitationInfo) newData.invitationInfo = {} as any;
        newData.invitationInfo.shareImageUrl = url;
      } else if (field === 'bride') {
        if (!newData.aboutUs) newData.aboutUs = {} as any;
        newData.aboutUs!.brideImageUrl = url;
      } else if (field === 'groom') {
        if (!newData.aboutUs) newData.aboutUs = {} as any;
        newData.aboutUs!.groomImageUrl = url;
      }
      setInvitation(newData);
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Momozzang Admin</h1>
        <div className={styles.controls}>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Invitation Slug"
            className={styles.slugInput}
          />
        </div>
        {isLoadingQuery && <span style={{ marginLeft: 10 }}>Loading data...</span>}
        {isSaving && <span style={{ marginLeft: 10 }}>Saving...</span>}
        <div style={{ marginTop: 10 }}>
          <Button onClick={handleSave} disabled={isSaving || !invitation} variant="primary">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </header>

      {invitation ? (
        <InvitationProvider data={invitation}>
          <div className={styles.content}>
            <Box variant="primary">
              <h3 className={styles.sectionHeader}>Main Images</h3>
              <div className={styles.grid}>
                <div>
                  <label className={styles.label}>Main Image</label>
                  {invitation.customization?.mainImageUrl && (
                    <img
                      src={invitation.customization.mainImageUrl}
                      alt="Main"
                      className={clsx(styles.previewImage, styles.previewMain)}
                    />
                  )}
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files?.[0] && handleSingleUpload(e.target.files[0], 'main')
                    }
                    disabled={isUploading}
                  />
                </div>

                <div>
                  <label className={styles.label}>Share Thumbnail (Kakao)</label>
                  {invitation.invitationInfo?.shareImageUrl && (
                    <img
                      src={invitation.invitationInfo.shareImageUrl}
                      alt="Share"
                      className={clsx(styles.previewImage, styles.previewSquare)}
                    />
                  )}
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files?.[0] && handleSingleUpload(e.target.files[0], 'share')
                    }
                    disabled={isUploading}
                  />
                </div>
              </div>
            </Box>

            <Box variant="primary">
              <h3 className={styles.sectionHeader}>Couple Images</h3>
              <div className={styles.grid}>
                <div>
                  <label className={styles.label}>Groom</label>
                  {invitation.aboutUs?.groomImageUrl && (
                    <img
                      src={invitation.aboutUs.groomImageUrl}
                      alt="Groom"
                      className={clsx(styles.previewImage, styles.previewSquare)}
                    />
                  )}
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files?.[0] && handleSingleUpload(e.target.files[0], 'groom')
                    }
                    disabled={isUploading}
                  />
                </div>

                <div>
                  <label className={styles.label}>Bride</label>
                  {invitation.aboutUs?.brideImageUrl && (
                    <img
                      src={invitation.aboutUs.brideImageUrl}
                      alt="Bride"
                      className={clsx(styles.previewImage, styles.previewSquare)}
                    />
                  )}
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files?.[0] && handleSingleUpload(e.target.files[0], 'bride')
                    }
                    disabled={isUploading}
                  />
                </div>
              </div>
            </Box>

            <GalleryManager
              album={invitation.album || []}
              onChange={(newAlbum) => setInvitation({ ...invitation, album: newAlbum })}
            />
          </div>
        </InvitationProvider>
      ) : (
        <div className={styles.loading}>
          {isLoadingQuery
            ? 'Loading...'
            : isError
              ? `Error: ${error.message}`
              : 'Please enter a slug to load invitation.'}
        </div>
      )}
    </div>
  );
}
