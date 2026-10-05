import unittest
from unittest.mock import Mock, patch

from services.sale_service import _paginate_sales, get_sale_type_label
from services.stock_service import _paginate_restock_history


class SaleTypeLabelTests(unittest.TestCase):
    def test_credit_sales_use_baadaye_label(self):
        self.assertEqual(get_sale_type_label("credit"), "BAADAYE ( SOLD ON CREDIT)")

    def test_standard_sales_use_regular_label(self):
        self.assertEqual(get_sale_type_label("standard"), "Regular Sale")

    @patch("services.sale_service._serialize_sales_bulk", return_value=[{"id": 3}])
    def test_paginated_sales_include_metadata(self, serialize_sales):
        query = Mock()
        query.paginate.return_value = Mock(
            items=[Mock()],
            total=51,
            page=2,
            per_page=25,
            pages=3,
        )

        result = _paginate_sales(query, 2, 25)

        query.paginate.assert_called_once_with(page=2, per_page=25, error_out=False)
        serialize_sales.assert_called_once_with(query.paginate.return_value.items)
        self.assertEqual(result, {
            "sales": [{"id": 3}],
            "total": 51,
            "page": 2,
            "per_page": 25,
            "pages": 3,
        })

    def test_paginated_sales_clamp_page_size(self):
        query = Mock()
        query.paginate.return_value = Mock(items=[], total=0, page=1, per_page=100, pages=0)

        _paginate_sales(query, 0, 500)

        query.paginate.assert_called_once_with(page=1, per_page=100, error_out=False)


class RestockHistoryPaginationTests(unittest.TestCase):
    @patch("services.stock_service._serialize_restock_movements", return_value=[{"id": 8}])
    def test_paginated_history_includes_metadata(self, serialize_movements):
        query = Mock()
        query.paginate.return_value = Mock(
            items=[Mock()],
            total=51,
            page=2,
            per_page=25,
            pages=3,
        )

        result = _paginate_restock_history(query, 2, 25)

        query.paginate.assert_called_once_with(page=2, per_page=25, error_out=False)
        serialize_movements.assert_called_once_with(query.paginate.return_value.items)
        self.assertEqual(result, {
            "history": [{"id": 8}],
            "total": 51,
            "page": 2,
            "per_page": 25,
            "pages": 3,
        })

    def test_paginated_history_clamps_page_and_page_size(self):
        query = Mock()
        query.paginate.return_value = Mock(items=[], total=0, page=1, per_page=100, pages=0)

        _paginate_restock_history(query, 0, 500)

        query.paginate.assert_called_once_with(page=1, per_page=100, error_out=False)


if __name__ == "__main__":
    unittest.main()
