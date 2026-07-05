import { useEffect, useRef } from 'react'

export function usePullToRefresh(onRefresh, { threshold = 120 } = {}) {
  const startY = useRef(0)
  const trackEl = useRef(null)

  useEffect(() => {
    const el = document.documentElement
    trackEl.current = el

    const onStart = (e) => {
      if (window.scrollY > 0) return
      startY.current = e.touches ? e.touches[0].clientY : e.clientY
    }

    const onMove = (e) => {
      if (startY.current == null || window.scrollY > 0) return
      const y = e.touches ? e.touches[0].clientY : e.clientY
      const dy = y - startY.current
      if (dy > 0 && dy < threshold + 50) {
        e.preventDefault()
        el.style.setProperty('--pull', `${dy}px`)
        el.style.setProperty('--pull-opacity', `${Math.min(dy / threshold, 1)}`)
      }
    }

    const onEnd = async () => {
      const dy = parseFloat(el.style.getPropertyValue('--pull')) || 0
      if (dy >= threshold && onRefresh) {
        el.style.setProperty('--pull', `${threshold}px`)
        try {
          await onRefresh()
        } catch {}
      }
      el.style.setProperty('--pull', '0px')
      el.style.setProperty('--pull-opacity', '0')
      startY.current = null
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('mousedown', onStart)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)

    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('mousedown', onStart)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
    }
  }, [onRefresh, threshold])

  return {
    pullIndicator: (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--pull, 0px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 'var(--pull-opacity, 0)',
        background: 'linear-gradient(180deg, #1e3a8a66, transparent)',
        transition: 'opacity .15s',
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        <div style={{
          padding: '8px 24px',
          background: '#1e293b',
          borderRadius: 20,
          fontSize: 13,
          color: '#60a5fa',
          boxShadow: '0 2px 8px #0005'
        }}>
          ↓ 下拉刷新
        </div>
      </div>
    )
  }
}
