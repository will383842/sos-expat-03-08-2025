import React from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

type SwitchProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

interface Props {
  profileId?: string;
  className?: string;
  SwitchComponent?: React.ComponentType<SwitchProps>; // allow inject UI library switch
}

export default function MapVisibilityToggle({ profileId, className = '', SwitchComponent }: Props) {
  const { user } = useAuth() as any;
  const [checked, setChecked] = React.useState<boolean>(true);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const sosProfileId = profileId || user?.uid;

  React.useEffect(() => {
    if (!sosProfileId) return;
    const ref = doc(db, 'sos_profiles', sosProfileId);
    return onSnapshot(ref, (snap) => {
      const data = snap.data() as any;
      setChecked(Boolean(data?.isVisibleOnMap ?? true));
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });
  }, [sosProfileId]);

  const onToggle = async (next: boolean) => {
    if (!sosProfileId) return;
    setChecked(next);
    try {
      await updateDoc(doc(db, 'sos_profiles', sosProfileId), {
        isVisibleOnMap: next,
        updatedAt: new Date(),
      });
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setChecked(!next); // revert on error
    }
  };

  if (!sosProfileId) return null;

  const SwitchEl = SwitchComponent || ((props: SwitchProps) =>
    <input type="checkbox" {...props} />
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <SwitchEl disabled={loading} checked={checked} onChange={(e: any) => onToggle(!!e.target.checked)} />
      <label>Apparaître sur la carte</label>
      {error && <span style={{ color: '#dc2626', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
