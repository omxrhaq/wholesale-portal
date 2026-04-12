import ExcelJS from "exceljs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Products");

  worksheet.columns = [
    { header: "Name", key: "name", width: 28 },
    { header: "SKU", key: "sku", width: 20 },
    { header: "Description", key: "description", width: 42 },
    { header: "Unit", key: "unit", width: 16 },
    { header: "Price", key: "price", width: 14 },
    { header: "Active", key: "isActive", width: 12 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF5E7C8" },
  };

  worksheet.addRows([
    {
      name: "Arabica Coffee Beans 1kg",
      sku: "COF-ARAB-1KG",
      description: "Full arabica blend for hospitality and office use.",
      unit: "bag",
      price: 18.5,
      isActive: "yes",
    },
    {
      name: "Oat Drink Barista 1L",
      sku: "OAT-BAR-1L",
      description: "Foams consistently for coffee drinks.",
      unit: "box",
      price: 2.95,
      isActive: "yes",
    },
  ]);

  worksheet.getColumn("price").numFmt = "#,##0.00";
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="product-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
