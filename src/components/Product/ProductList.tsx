import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import ProductCard from './ProductCard';
import Loader from '../ui/loader';
import { Fragment } from 'react';
import { Pagination, PaginationContent , PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination';

const ProductList = () => {

  const { error, loading, products, limit, skip, total } = useSelector((state: RootState) => state.products);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  const handlePageChange = (_page: number) => {
      // Todo Pagination
  }

  return (
    <section>
      <div className='w-full flex items-center justify-center min-h-40 flex-col'>
        {
          loading ? (
            <Loader loaderText='Fetching your products' />
          ) : error ? (
            <p className='text-red-300'>There was an error in fetching product data: {error}</p>
          ) : (
            <Fragment>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                {products.map(product => (
                  <ProductCard
                    description={product.description}
                    is_liked={false}
                    name={product.title}
                    price={1}
                    rating={Math.floor(product.rating)}
                    thumbnail={product.thumbnail}
                    key={product.id.toString()}
                  />
                ))}
              </div>
              { !totalPages ? null :
              <Pagination className='mt-5'>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => handlePageChange(i + 1)}
                        isActive={i + 1 === currentPage}
                        className='cursor-pointer'
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>}
            </Fragment>
          )
        }
      </div>
    </section>
  );
};

export default ProductList;