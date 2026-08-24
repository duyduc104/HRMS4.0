export const isExtensionActive = () => {
  // Tìm thẻ meta mà Extension tiêm vào DOM
  const metaTag = document.querySelector('meta[name="hrms-extension-active"]');
  return metaTag !== null;
};
