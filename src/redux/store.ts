import { configureStore } from '@reduxjs/toolkit'
import productReducer from './slices/productSlice';
import { useDispatch } from 'react-redux';
import categoryReducer from './slices/categorySlice';

const store = configureStore({
    reducer : {
        products : productReducer,
        category : categoryReducer
    }
})


export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch = () => useDispatch<typeof store.dispatch>()

export default store;
