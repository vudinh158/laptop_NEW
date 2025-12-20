// client/app/hooks/useDebounce.js
import { useState, useEffect } from "react";

/**
 * Custom hook để debounce giá trị
 * @param {any} value - Giá trị cần debounce
 * @param {number} delay - Thời gian delay (ms), mặc định 500ms
 * @returns {any} - Giá trị đã được debounce
 *
 * Cách sử dụng trong component:
 *
 * import { useDebounce } from "../hooks/useDebounce";
 *
 * function SearchComponent() {
 *   const [searchValue, setSearchValue] = useState("");
 *   const debouncedSearchValue = useDebounce(searchValue, 500);
 *
 *   // State hiển thị cập nhật ngay lập tức khi user gõ
 *   const handleInputChange = (e) => {
 *     setSearchValue(e.target.value);
 *   };
 *
 *   // API chỉ gọi khi debouncedSearchValue thay đổi (sau 500ms ngừng gõ)
 *   useEffect(() => {
 *     if (debouncedSearchValue) {
 *       searchAPI(debouncedSearchValue);
 *     }
 *   }, [debouncedSearchValue]);
 *
 *   return (
 *     <input
 *       value={searchValue}
 *       onChange={handleInputChange}
 *       placeholder="Tìm kiếm địa chỉ..."
 *     />
 *   );
 * }
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set timeout để cập nhật giá trị sau delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: clear timeout nếu value thay đổi trước khi hết delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
