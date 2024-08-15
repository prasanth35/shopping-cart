import { Select, SelectContent, SelectGroup, SelectItem , SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchProducts } from "@/redux/slices/productSlice"
import { RootState, useAppDispatch } from "@/redux/store"
import { useSelector } from "react-redux"

const ProductCategorySelect = () => {

    const { category: categoryList, loading } = useSelector((state: RootState) => state.category)
    const dispatch = useAppDispatch()
    const onSelectCategory = (value:string) => {
        const categoryUrl = categoryList.find(category => category.name === value)?.url
        dispatch(fetchProducts({
            categoryUrl : categoryUrl,
        }))
    }
    return (
        <Select onValueChange={onSelectCategory}>
            <SelectTrigger disabled={loading} className="w-[280px]">
                <SelectValue placeholder={loading ? "Fetching categories" : "Select category" }/>
            </SelectTrigger>
            <SelectContent className="w-[280px]">
                <SelectGroup>
                    <SelectLabel>Categories</SelectLabel>
                    {categoryList.map(category =>
                        <SelectItem key={category.name} value={category.name}>{category.name}</SelectItem>)
                    }
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}

export default ProductCategorySelect