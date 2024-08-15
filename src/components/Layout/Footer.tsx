import { Facebook, Instagram, TabletSmartphone, Twitter, Youtube } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Fragment } from 'react/jsx-runtime';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface IconSection { label: string; icon: JSX.Element; url: string; }

const Footer = () => {
  const companyInfo: FooterSection = {
    title: 'Company Info',
    links: [
      { label: 'About', href: '' },
      { label: 'Social Responsibility', href: '' },
      { label: 'Affiliate', href: '' },
      { label: 'Fashion Blogger', href: '' },
    ],
  };

  const helpSupport: FooterSection = {
    title: 'Help & Support',
    links: [
      { label: 'Shipping Info', href: '' },
      { label: 'Returns', href: '' },
      { label: 'How to Order', href: '' },
      { label: 'How to Track', href: '' },
      { label: 'Size Chart', href: '' },
    ],
  };

  const customerCare: FooterSection = {
    title: 'Customer Care',
    links: [
      { label: 'Contact Us', href: '' },
      { label: 'Payment', href: '' },
      { label: 'Bonus Point', href: '' },
      { label: 'Notices', href: '' },
    ],
  };

  const social: IconSection[] = [
    {
      label: 'Facebook',
      icon: <Facebook />,
      url: ''
    },
    {
      label: 'Twitter',
      icon: <Twitter />,
      url: ''
    },
    {
      label: 'Instagram',
      icon: <Instagram />,
      url: ''
    },
    {
      label: 'Youtube',
      icon: <Youtube />,
      url: ''
    },
  ]

  const platForms: IconSection[] = [
    {
      label: 'Android',
      icon: <TabletSmartphone />,
      url: ''
    },
    {
      label: 'IOS',
      icon: <TabletSmartphone />,
      url: ''
    },
  ]



  const sections: FooterSection[] = [companyInfo, helpSupport, customerCare];

  return (
    <div className="bg-neutral-100 py-5 px-5 sm:h-80 overflow-hidden">
      <div className='grid grid-rows-1 sm:grid-rows-2 gap-2'>
        <div className='grid grid-cols-1 sm:grid-cols-4'>
          {sections.map((section) => (
            <div key={section.title}>
              <h5 className="text-lg font-semibold mb-4">{section.title}</h5>
              <ul>
                {section.links.map((link) => (
                  <li key={link.label} className="mb-2 text-sm text-neutral-500">
                    <a href={link.href} className="hover:text-gray-900 transition">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className='flex flex-col gap-10'>
            <div className='flex flex-col gap-5 sm:flex-row sm:gap-10 w-full'>
              <IconMapper list={social} title='Social' />
              <IconMapper list={platForms} title='PLATFORM' />
            </div>
            <SignUpSection />
          </div>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2'>
          <div className="order-2 sm:order-1">
          <RightsAndLinksSection />
          </div>
          <div className="order-1 sm:order-2">
          <PaymentsCardSection />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;


const IconMapper = (props: { list: IconSection[], title: string }) => {
  const { list, title } = props
  return (
    <div className='flex flex-col items-start'>
      <h5 className="text-lg font-semibold mb-4">{title}</h5>
      <div className="flex space-x-4">
        {
          list.map(soc =>
            <a href={soc.url} key={soc.label}>
              {soc.icon}
            </a>
          )
        }
      </div>
    </div>
  )
}


const SignUpSection = () => {
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-row gap-2'>
        <Input
          placeholder='Your Email'
        />
        <Button variant={'default'} color='black'> SUBSCRIBE </Button>
      </div>
      <p className='text-sm'>By clicking the SUBSCRIBE button, you are agreeing to our <a href="" className='underline text-blue-400 underline-offset-1'>Privacy & Cookie Policy</a></p>
    </div>
  )
}


const PaymentsCardSection = () => {

  const paymentSection: IconSection[] = [
    {
      icon: <i className="text-3xl fa fa-cc-mastercard" />,
      label: 'Mastercard',
      url: ''
    },
    {
      icon: <i className="text-3xl fa fa-cc-paypal" />,
      label: 'Paypal',
      url: ''
    },
    {
      icon: <i className="text-3xl fa fa-cc-amex" />,
      label: 'American Express',
      url: ''
    },
    {
      icon: <i className="text-3xl fa fa-cc-diners-club" />,
      label: 'Dinner Club',
      url: ''
    },
    {
      icon: <i className="text-3xl fa fa-cc-discover" />,
      label: 'Discover',
      url: ''
    },
    {
      icon: <i className="text-3xl fa fa-cc-jcb" />,
      label: 'JCB',
      url: ''
    },
    {
      icon: <i className="text-3xl fa fa-cc-stripe" />,
      label: 'Stripe',
      url: ''
    },
    {
      icon: <i className="text-3xl fa fa-cc-visa" />,
      label: 'Visa',
      url: ''
    },
    {
      icon: <i className="text-3xl fa fa-credit-card" />,
      label: 'Credit Card',
      url: ''
    },
  ]

  return (
    <div>
      <p className='text-lg font-semibold'>We Accept</p>
      <div className='flex flex-row gap-2 flex-wrap'>
        {
          paymentSection.map(cards =>
            <Fragment key={cards.label}>
              {cards.icon}
            </Fragment>
          )
        }
      </div>
    </div>
  )
}

const RightsAndLinksSection = () => {

  const links: {label: string,url: ''}[] = [
      {
        label: 'Privacy Center',
        url: ''
      },
      {
        label: 'Privacy & Cookie Policy',
        url: ''
      },
      {
        label: 'Manage Cookies',
        url: ''
      },
      {
        label: 'Terms & Conditions',
        url: ''
      },
      {
        label: 'Copyright Notice',
        url: ''
      },
      {
        label: 'Imprint',
        url: ''
      }
    ]

  return (
    <div className='text-neutral-400 flex flex-col'>
      <p>&copy;2010-2022 All Rights Reserved</p>
      <div className='flex flex-row gap-2 mt-2 flex-wrap'>
        {links.map(link =>
          <p key={link.label}>
            <a className='underline font-medium text-nowrap text-xs hover:text-gray-900 transition' href={link.url}>{link.label}</a>
          </p>
        )}
      </div>
    </div>
  )
}