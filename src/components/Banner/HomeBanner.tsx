import { Card, CardContent } from '../ui/card'

const HomeBanner = () => {
    return (
        <Card className=' h-24 bg-gradient-to-r from-emerald-800 to-rose-600'>
            <CardContent className='p-2'>
                <div className='flex flex-col gap-1 text-start'>
                    <p className='text-white text-lg font-semibold'>Lorem ipsum</p>
                    <p className='text-neutral-200 text-sm'>
                        Slash sales begin in June.Get up to 80% Discount on all products <span className='text-white text-sm font-semibold'>Read More</span>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

export default HomeBanner
