import React, { useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

type Props = {
  className?: string;
};

const AvailabilityToggle: React.FC<Props> = ({ className = "" }) => {
  const { user, setUserAvailability, isLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Calcul Ã©tat online/offline depuis user
  const isOnline = useMemo(() => {
    if (!user) return false;
    if (user.availability === "available") return true;
    if (user.availability === "offline") return false;
    return typeof user.isOnline === "boolean" ? user.isOnline : false;
  }, [user]);

  const disabled =
    saving ||
    isLoading ||
    !user ||
    (user?.role !== "lawyer" && user?.role !== "expat");

  const handleToggle = async () => {
    if (disabled) return;
    setErrorText(null);
    setSaving(true);
    try {
      await setUserAvailability(isOnline ? "offline" : "available");
      // pas dâ€™update locale â†’ on attend le snapshot Firestore
    } catch (e) {
      setErrorText(
        e instanceof Error ? e.message : "Une erreur est survenue."
      );
    } finally {
      setSaving(false);
    }
  };

  const stateClasses = isOnline
    ? "bg-emerald-100 border-emerald-500 text-emerald-800"
    : "bg-gray-100 border-gray-300 text-gray-700";

  return (
    <div className={className}>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={[
            "group inline-flex items-center justify-center gap-2",
            "border rounded-xl",
            "px-3 py-2",
            "transition-colors duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400",
            stateClasses,
            "h-10 min-w-[130px]", // largeur/hauteur fixes
            disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-95",
          ].join(" ")}
          aria-pressed={isOnline}
          aria-busy={saving}
          aria-label={isOnline ? "Se mettre hors ligne" : "Se mettre en ligne"}
        >
          {/* Bulle verte/rouge */}
          <span
            aria-hidden
            className={[
              "inline-block w-2.5 h-2.5 rounded-full",
              isOnline ? "bg-emerald-500" : "bg-red-500",
              "shadow-[0_0_0_3px_rgba(0,0,0,0.04)]",
            ].join(" ")}
          />
          {/* Texte */}
          <span className="inline-block font-medium tracking-tight text-sm">
            {isOnline ? "En ligne" : "Hors ligne"}
          </span>
        </button>

        {/* Spinner en overlay (ne bouge pas le layout) */}
        {saving && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/70 border border-black/5">
              <svg
                className="w-3.5 h-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-80"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V2C5.373 2 2 5.373 2 12h2z"
                />
              </svg>
            </span>
          </span>
        )}
      </div>

      {errorText && (
        <p role="status" aria-live="polite" className="mt-2 text-xs text-red-500">
          {errorText}
        </p>
      )}
    </div>
  );
};

export default AvailabilityToggle;
