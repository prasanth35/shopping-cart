import HomeBanner from "@/components/Banner/homeBanner"
import Footer from "@/components/Layout/footer"
import Header from "@/components/Layout/header"
import ProductCategorySelect from "@/components/Product/ProductCategorySelect"
import ProductList from "@/components/Product/ProductList"
import { fetchCategory } from "@/redux/slices/categorySlice"
import { fetchProducts } from "@/redux/slices/productSlice"
import { useAppDispatch } from "@/redux/store"
import { useEffect } from "react"


const Home = () => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(fetchProducts({}))
        dispatch(fetchCategory())
    }, [])

    return (
        <main className="flex flex-col h-screen relative">
            <header className="sm:fixed w-full bg-white z-50">
                <Header />
            </header>
            <section className="p-6">
                <div className="sm:mt-16">
                    <ProductCategorySelect />
                </div>
                <div className="mt-5">
                    <HomeBanner />
                </div>
                <div className="mt-5">
                    <ProductList />
                </div>
            </section>
            <footer>
                <Footer />
            </footer>
        </main>
    )
}

export default Home
