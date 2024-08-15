import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

export interface Product {
    id: number
    title: string
    description: string
    category: string
    price: number
    discountPercentage: number
    rating: number
    stock: number
    tags: string[]
    brand: string
    sku: string
    weight: number
    dimensions: Dimensions
    warrantyInformation: string
    shippingInformation: string
    availabilityStatus: string
    reviews: Review[]
    returnPolicy: string
    minimumOrderQuantity: number
    meta: Meta
    images: string[]
    thumbnail: string
  }
  
  export interface Dimensions {
    width: number
    height: number
    depth: number
  }
  
  export interface Review {
    rating: number
    comment: string
    date: string
    reviewerName: string
    reviewerEmail: string
  }
  
  export interface Meta {
    createdAt: string
    updatedAt: string
    barcode: string
    qrCode: string
  }


  interface ProductState {
    products: Product[]
    loading: boolean
    error: string | null
    total: number
    skip: number
    limit: number
  }

  interface FetchProductsParams {
    searchText?: string;
    categoryUrl?: string | null;
  }
  
  
  const initialState:ProductState = {
        error : null,
        loading : false,
        products : [],
        total: 0,
        skip: 0,
        limit: 0
  }

  export const fetchProducts = createAsyncThunk(
    'products/fetch',
    async ({ searchText = '' , categoryUrl } : FetchProductsParams) => {
      let productsApi = 'https://dummyjson.com/products';
      
      if (searchText) {
        productsApi = `https://dummyjson.com/products/search?q=${searchText}`;
      }

      productsApi = categoryUrl ? categoryUrl : productsApi
      const response = await fetch(productsApi);
      const data = await response.json();
      return {
        products: data.products,
        total: data?.total ?? 0,
        skip: data?.skip ?? 0,
        limit: data?.limit ?? 0,
      }
    }
  );



const productsSlice = createSlice({
    name : 'products',
    initialState,
    reducers : {},
    extraReducers : (builder) => {
        builder
            .addCase(fetchProducts.pending ,(state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled ,(state,action) => {
                state.loading = false;
                state.error = null;
                state.products = action.payload.products;
                state.limit = action.payload.limit;
                state.skip = action.payload.skip;
                state.total = action.payload.total
            })
            .addCase(fetchProducts.rejected ,(state,action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch products';
            })
    }
})
 export default productsSlice.reducer;