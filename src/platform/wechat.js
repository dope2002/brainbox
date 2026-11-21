function createWechatPlatform(api) {
  function viewport() {
    const info = api.getWindowInfo ? api.getWindowInfo() : api.getSystemInfoSync();
    const { windowWidth: width, windowHeight: height, pixelRatio = 1, safeArea } = info;
    const menu = api.getMenuButtonBoundingClientRect
      ? api.getMenuButtonBoundingClientRect()
      : null;
    return {
      width,
      height,
      pixelRatio,
      safeArea: safeArea || { left: 0, top: 0, right: width, bottom: height },
      menu
    };
  }

  function listenTouch(method, handler) {
    api[method](event => {
      // 微信触摸坐标已使用逻辑像素。DPR 只用于画布的 backing store。
      handler(event.changedTouches.map(touch => ({
        id: touch.identifier,
        x: touch.clientX === undefined ? touch.pageX : touch.clientX,
        y: touch.clientY === undefined ? touch.pageY : touch.clientY
      })));
    });
  }

  return {
    getStorage(key) {
      try {
        return api.getStorageSync(key);
      } catch (error) {
        // Storage can be unavailable in the preview environment.
        return undefined;
      }
    },
    setStorage(key, value) {
      try {
        api.setStorageSync(key, value);
      } catch (error) {
        // The guide is still dismissed for the current session.
      }
    },
    now: () => Date.now(),
    requestFrame: callback => typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(callback) : setTimeout(callback, 16),
    cancelFrame: id => typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame(id) : clearTimeout(id),
    createCanvas: () => api.createCanvas(),
    viewport,
    onStart: handler => listenTouch('onTouchStart', handler),
    onMove: handler => listenTouch('onTouchMove', handler),
    onEnd: handler => listenTouch('onTouchEnd', handler),
    onCancel: handler => api.onTouchCancel(handler),
    onHide: handler => api.onHide(handler),
    onShow: handler => api.onShow(handler),
    onResize: handler => {
      if (api.onWindowResize) api.onWindowResize(handler);
    }
  };
}

module.exports = { createWechatPlatform };
