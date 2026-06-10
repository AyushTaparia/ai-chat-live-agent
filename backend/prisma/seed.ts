import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding knowledge base...');

  const faqs = [
    {
      key: 'store_info',
      value: "Welcome to Spur Goods! We sell premium, minimalist tech accessories, workspace essentials, and leather goods designed for creators and professionals. We are located online at spurgoods.com."
    },
    {
      key: 'shipping_policy',
      value: "We offer free shipping on all orders over $50 within the United States. For orders below $50, standard shipping is a flat rate of $4.99. Standard shipping takes 3 to 5 business days. We also offer expedited 2-day shipping for $14.99. International shipping is available to most countries for a flat rate of $19.99 and takes 7 to 14 business days."
    },
    {
      key: 'return_policy',
      value: "We want you to love your purchase. If you're not completely satisfied, you can return any unused and undamaged items in their original packaging within 30 days of delivery for a full refund or exchange. Return shipping is free for US customers. Once we receive your item, refunds are processed back to your original payment method within 5 to 7 business days."
    },
    {
      key: 'support_hours',
      value: "Our customer support team is happy to help! You can chat with us live on our website Monday through Friday, from 9:00 AM to 6:00 PM Eastern Time (EST). If you contact us outside of these hours, please leave your email address in the chat, or send an email to support@spurgoods.com, and we will get back to you within 24 business hours."
    }
  ];

  for (const faq of faqs) {
    await prisma.knowledge.upsert({
      where: { key: faq.key },
      update: { value: faq.value },
      create: {
        key: faq.key,
        value: faq.value
      }
    });
  }

  console.log('Knowledge base seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
