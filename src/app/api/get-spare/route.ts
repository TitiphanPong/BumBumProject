// ใน Next.js
const fetchSpareParts = async () => {
  const res = await fetch('/api/get-spareparts');
  const data = await res.json();
//   setSpareParts(data);
};
