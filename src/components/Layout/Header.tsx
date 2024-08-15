import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchProducts } from '@/redux/slices/productSlice';
import { useAppDispatch } from '@/redux/store';
import { ShoppingBasket } from 'lucide-react'
import { useEffect, useState } from 'react'


interface HeaderProps {

}
const Header = (props: HeaderProps) => {
    const { } = props
    const dispatch = useAppDispatch()
    const [searchText, setSearchText] = useState<string>('')
    const debouncedSearchText = useDebounce(searchText, 500);

    useEffect(() => { dispatch(fetchProducts({
        searchText : debouncedSearchText
    })); }, [debouncedSearchText, dispatch]);

    const onSearchTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(event.target.value);
    };


    const links: ({ label: string; navigateTo: string; icon: undefined; } | { label: string; navigateTo: string; icon: JSX.Element; })[] = [
        {
            label: 'Store',
            navigateTo: '',
            icon: undefined
        },
        {
            label: 'Account',
            navigateTo: '',
            icon: undefined
        },
        {
            label: 'Whish List',
            navigateTo: '',
            icon: undefined
        },
        {
            label: 'Basket',
            navigateTo: '',
            icon: <ShoppingBasket size={20} />
        }
    ]

    return (
        <nav className="bg-white border-gray-200 px-4 lg:px-6 py-2.5 dark:bg-gray-800 w-full">
            <div className='flex sm:flex-row items-center sm:justify-between flex-col gap-2'>
                <p className='font-extrabold text-xl'>
                    <span className='text-pink-500'>M</span>
                    <span>oBoo</span>
                    <span className='text-pink-500'>M</span>
                </p>
                <Input
                    placeholder='Search Products'
                    containerStyle='max-w-xl'
                    type='search'
                    onChange={onSearchTextChange}
                />
                <div className='flex flex-row items-center gap-3'>
                    {
                        links.map(link =>
                            <a className={`text-sm flex flex-row gap-2 items-center ${link.label === 'Basket' ? 'font-semibold' : ''}`} href={link.navigateTo} key={link.label}>
                                <span>{link.label}</span>
                                {link.icon ? <span>{link.icon}</span> : null}
                            </a>)
                    }
                </div>
            </div>
            </nav>
    )
}
export default Header
