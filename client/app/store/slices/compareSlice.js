// client/app/store/slices/compareSlice.js
import { createSlice } from "@reduxjs/toolkit";

const MAX = 3;
const compareSlice = createSlice({
  name: "compare",
  initialState: { items: [] }, // [{variation_id, product_id, product_name, thumbnail_url, discount_percentage, specs, variation}]
  reducers: {
    addCompare(state, action) {
      const p = action.payload;
      // Check trùng dựa trên variation_id
      if (state.items.find(x => x.variation_id === p.variation_id)) return;
      if (state.items.length >= MAX) state.items.shift(); // bỏ cái cũ nhất
      state.items.push(p);
    },
    removeCompare(state, action) {
      // Xóa dựa trên variation_id
      state.items = state.items.filter(x => x.variation_id !== action.payload);
    },
    clearCompare(state) {
      state.items = [];
    },
  },
});
export const { addCompare, removeCompare, clearCompare } = compareSlice.actions;
export default compareSlice.reducer;
