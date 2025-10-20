// client/app/store/slices/compareSlice.js
import { createSlice } from "@reduxjs/toolkit";

const MAX = 3;
const compareSlice = createSlice({
  name: "compare",
  initialState: { items: [] }, // [{product_id, product_name, thumbnail_url, specs}]
  reducers: {
    addCompare(state, action) {
      const p = action.payload;
      if (state.items.find(x => x.product_id === p.product_id)) return;
      if (state.items.length >= MAX) state.items.shift(); // bỏ cái cũ nhất
      state.items.push(p);
    },
    removeCompare(state, action) {
      state.items = state.items.filter(x => x.product_id !== action.payload);
    },
    clearCompare(state) {
      state.items = [];
    },
  },
});
export const { addCompare, removeCompare, clearCompare } = compareSlice.actions;
export default compareSlice.reducer;
