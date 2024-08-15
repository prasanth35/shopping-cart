import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";


interface category {
    slug : string;
    name : string;
    url : string;
}

interface categoryState {
    category : category[]
    loading : boolean;
    error : string | null;
}

const initialState:categoryState = {
    category : [],
    error : null,
    loading : false
}

export const fetchCategory = createAsyncThunk('category/fetch',
    async() => {
        let categoryApi = 'https://dummyjson.com/products/categories'
        const response = await fetch(categoryApi)
        const data = await response.json()
        return data || [];
    }
)



const categorySlice = createSlice({
    name : 'category',
    initialState,
    reducers : {},
    extraReducers : (builder) => {
        builder
        .addCase(fetchCategory.pending ,(state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(fetchCategory.fulfilled ,(state,action) => {
            state.loading = false;
            state.error = null;
            state.category = action.payload;
        })
        .addCase(fetchCategory.rejected ,(state,action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch products';
        })
    }
})

export default categorySlice.reducer