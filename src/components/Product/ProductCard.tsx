import { Heart, Star } from 'lucide-react';
import { Card, CardContent, CardFooter } from '../ui/card';

const DESCRIPTION_LENGTH = 60

interface ProductCardProps {
    thumbnail: string;
    name: string;
    description: string;
    price: number;
    rating: number;
    is_liked: boolean
}

const ProductCard = (props: ProductCardProps) => {
    const { description, is_liked, name, price, rating, thumbnail } = props

    const descriptionLength = description?.length
    const alteredDescription = descriptionLength > DESCRIPTION_LENGTH ? description.substring(0,DESCRIPTION_LENGTH) + '...' : description
    return (
        <Card className='min-w-56 max-w-sm min-h-64 max-h-90 cursor-pointer shadow-md'>
            <CardContent className='p-0 min-h-56 relative'>
                <div className='z-10 absolute right-2 mt-2 p-1 bg-slate-200'>
                    <Heart fill={is_liked ? 'red' : ''} size={20} className='text-white' />
                </div>
                <img loading='lazy' alt={name} className='w-full object-cover' src={thumbnail} />
            </CardContent>
            <CardFooter className='px-3 py-2'>
                <div className='flex flex-col gap-2'>
                    <p className='font-semibold text-sm'>{name}</p>
                    <p className='text-neutral-400 text-xs max-h-10 text-wrap text-justify overflow-hidden'>{alteredDescription}</p>
                    <p className='font-semibold text-sm'>$ {price}</p>
                    <Rating ratingCount={rating}/>
                </div>
            </CardFooter>
        </Card>
    )
}

export default ProductCard

interface RatingProps {
    ratingCount : number
}
const Rating = (props:RatingProps) => {
    const { ratingCount } = props
    const starCount = [1, 2, 3, 4, 5]
    return (
        <div className='flex flex-row gap-2'>
            {
                starCount.map((star,index) =>
                    <Star size={14} fill={ratingCount <= index ? "white" : 'gold'} strokeWidth={1} key={star.toString()} />
                )
            }
        </div>
    )
}
