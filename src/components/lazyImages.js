import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const LazyImage = ({ 
  src, 
  alt = '', 
  className = '', 
  placeholder,
  fallbackSrc,
  mobileSrc,
  tabletSrc,
  desktopSrc,
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  quality = 'auto',
  format = 'auto',
  aspectRatio,
  objectFit = 'cover',
  backgroundColor = '#f5f5f5',
  blurDataURL,
  priority = false,
  rootMargin = '50px',
  threshold = 0.1,
  onLoad,
  onError,
  onStartLoading,
  debug = false,
  ...imgProps
}) => {
  const [loadState, setLoadState] = useState({
    isLoaded: false,
    isInView: false,
    hasError: false,
    isLoading: false,
    loadAttempts: 0
  });
  
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  const aspectRatioStyle = useMemo(() => {
    if (!aspectRatio) return {};
    
    const [width, height] = aspectRatio.split(':').map(Number);
    return {
      paddingBottom: `${(height / width) * 100}%`,
      height: 0
    };
  }, [aspectRatio]);

  const getOptimalImageSrc = useCallback(() => {
    if (typeof window === 'undefined') return src;
    
    const width = window.innerWidth;
    const pixelRatio = window.devicePixelRatio || 1;
    const effectiveWidth = width * pixelRatio;
    
    if (effectiveWidth < 768 && mobileSrc) return mobileSrc;
    if (effectiveWidth < 1024 && tabletSrc) return tabletSrc;
    if (desktopSrc) return desktopSrc;
    
    return src;
  }, [src, mobileSrc, tabletSrc, desktopSrc]);

  const handleImageError = useCallback((error) => {
    setLoadState(prev => {
      const newAttempts = prev.loadAttempts + 1;
      
      if (newAttempts === 1 && fallbackSrc) {
        return {
          ...prev,
          loadAttempts: newAttempts,
          hasError: false
        };
      }
      
      return {
        ...prev,
        hasError: true,
        isLoading: false,
        loadAttempts: newAttempts
      };
    });
    
    onError?.(error);
  }, [fallbackSrc, onError]);

  const handleImageLoad = useCallback((event) => {
    setLoadState(prev => ({
      ...prev,
      isLoaded: true,
      isLoading: false,
      hasError: false
    }));
    
    onLoad?.(event);
  }, [onLoad]);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadState(prev => {
            if (prev.isInView) return prev;
            
            onStartLoading?.();
            return {
              ...prev,
              isInView: true,
              isLoading: true
            };
          });
          
          observer.disconnect();
        }
      },
      { 
        threshold,
        rootMargin: priority ? '200px' : rootMargin,
      }
    );

    observer.observe(imgRef.current);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [threshold, rootMargin, priority, onStartLoading]);

  const finalImageSrc = useMemo(() => {
    if (loadState.hasError && loadState.loadAttempts === 1 && fallbackSrc) {
      return fallbackSrc;
    }
    return getOptimalImageSrc();
  }, [loadState.hasError, loadState.loadAttempts, fallbackSrc, getOptimalImageSrc]);

  const containerStyles = useMemo(() => ({
    position: 'relative',
    overflow: 'hidden',
    backgroundColor,
    ...aspectRatioStyle,
    ...(debug && {
      border: '2px dashed #ff0000',
      boxSizing: 'border-box'
    })
  }), [backgroundColor, aspectRatioStyle, debug]);

  const imageStyles = useMemo(() => ({
    width: '100%',
    height: aspectRatio ? '100%' : 'auto',
    position: aspectRatio ? 'absolute' : 'static',
    top: aspectRatio ? 0 : 'auto',
    left: aspectRatio ? 0 : 'auto',
    display: 'block',
    objectFit,
    opacity: loadState.isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    maxWidth: '100%',
    imageRendering: quality === 'high' ? 'crisp-edges' : 'auto',
  }), [aspectRatio, objectFit, loadState.isLoaded, quality]);

  const placeholderStyles = useMemo(() => ({
    position: aspectRatio || loadState.isInView ? 'absolute' : 'static',
    top: 0,
    left: 0,
    width: '100%',
    height: aspectRatio ? '100%' : '200px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor,
    fontSize: '14px',
    color: '#666',
    zIndex: 1,
    ...(blurDataURL && !loadState.hasError && {
      backgroundImage: `url(${blurDataURL})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: 'blur(10px)',
    })
  }), [aspectRatio, loadState.isInView, loadState.hasError, backgroundColor, blurDataURL]);

  const renderPlaceholder = () => {
    if (loadState.isLoaded && !loadState.hasError) return null;

    const content = loadState.hasError ? (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>!</div>
        <div>Erreur de chargement</div>
        {debug && (
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
            Tentatives: {loadState.loadAttempts}
          </div>
        )}
      </div>
    ) : loadState.isLoading ? (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '20px', marginBottom: '8px' }}>...</div>
        <div>{placeholder || 'Chargement...'}</div>
      </div>
    ) : (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '20px', marginBottom: '8px' }}>IMG</div>
        <div>{placeholder || 'Image'}</div>
      </div>
    );

    return (
      <div 
        className="lazy-image-placeholder"
        style={placeholderStyles}
      >
        {content}
      </div>
    );
  };

  return (
    <div 
      ref={imgRef} 
      className={`lazy-image-container ${className}`}
      style={containerStyles}
      {...(debug && {
        'data-debug': JSON.stringify({
          isLoaded: loadState.isLoaded,
          isInView: loadState.isInView,
          hasError: loadState.hasError,
          loadAttempts: loadState.loadAttempts,
          src: finalImageSrc
        })
      })}
    >
      {loadState.isInView && !loadState.hasError && (
        <img
          src={finalImageSrc}
          alt={alt}
          loading={priority ? 'eager' : loading}
          sizes={sizes}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={imageStyles}
          className="lazy-image-img"
          {...imgProps}
        />
      )}
      
      {renderPlaceholder()}
      
      {debug && (
        <div style={{
          position: 'absolute',
          top: '5px',
          left: '5px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          fontSize: '10px',
          borderRadius: '4px',
          zIndex: 999
        }}>
          {loadState.isInView ? 'VIEW' : 'WAIT'} 
          {loadState.isLoading ? ' LOAD' : ''}
          {loadState.isLoaded ? ' OK' : ''}
          {loadState.hasError ? ' ERR' : ''}
        </div>
      )}
    </div>
  );
};

export default LazyImage;