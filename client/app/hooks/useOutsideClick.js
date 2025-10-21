import { useEffect } from 'react';

export default function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      // Bỏ qua nếu click bên trong phần tử đang được tham chiếu
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      // Thực thi handler (đóng dropdown) nếu click ra ngoài
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}