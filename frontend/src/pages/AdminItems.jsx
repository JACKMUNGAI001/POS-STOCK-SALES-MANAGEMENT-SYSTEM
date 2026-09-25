import { useState, useEffect, useContext } from "react";
import api from "../api/api";
import { Package, Plus, Edit, Trash2, Search, CalendarX } from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";
import { SearchContext } from "../context/SearchContext";

export default function AdminItems() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const { searchQuery, searchType } = useContext(SearchContext);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get("/items");
      setItems(response.data);
    } catch (err) {
      console.error("Error fetching items");
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/items/categories");
      setCategories(response.data);
    } catch (err) {
      console.error("Error fetching categories");
    }
  };

  const filteredItems = searchQuery
    ? items.filter(item => {
        if (searchType === 'date' && item.created_at) {
            return item.created_at.startsWith(searchQuery);
        }
        const searchLower = searchQuery.toLowerCase();
        const categoryName = categories.find(c => c.id === item.category_id)?.name || "";
        return item.name.toLowerCase().includes(searchLower) || categoryName.toLowerCase().includes(searchLower);
      })
    : items;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.put(`/items/${editingId}`, formData);
        alert("Item updated!");
      } else {
        await api.post("/items", formData);
        alert("Item created!");
      }
      fetchItems();
      resetForm();
    } catch (err) {
      alert(`Error saving item: ${err.response?.data?.msg || err.message}`);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      category_id: item.category_id,
    });
    setEditingId(item.id);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this item?")) return;
    try {
      await api.delete(`/items/${id}`);
      alert("Item deleted!");
      fetchItems();
    } catch (err) {
      alert(`Error deleting item: ${err.response?.data?.msg || err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", category_id: "" });
    setEditingId(null);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await api.post("/items/categories", { name: newCategoryName });
      alert("Category created!");
      setNewCategoryName("");
      fetchCategories();
    } catch (err) {
      alert(`Error creating category: ${err.response?.data?.msg || err.message}`);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete this category? This will fail if products are linked to it.")) return;
    try {
      await api.delete(`/items/categories/${id}`);
      alert("Category deleted!");
      fetchCategories();
    } catch (err) {
      alert(`Error deleting category: ${err.response?.data?.msg || err.message}`);
    }
  };

  return (
    <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* ITEM FORM */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 md:mb-8 flex items-center gap-2 transition-colors">
              {editingId ? <Edit className="text-blue-600 dark:text-blue-400" /> : <Plus className="text-blue-600 dark:text-blue-400" />}
              {editingId ? "Edit Product Details" : "Register New Product"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase mb-1 px-1 transition-colors">Product Name</label>
                <input name="name" className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all" value={formData.name} onChange={handleInputChange} placeholder="e.g. 13kg Gas Cylinder" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase mb-1 px-1 transition-colors">Category</label>
                <SearchableSelect
                  options={categories}
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  placeholder="Select Category..."
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button onClick={handleSave} className="w-full sm:flex-1 lg:flex-none lg:px-12 bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all">
                {editingId ? "Update Product" : "Create Product"}
              </button>
              {editingId && (
                <button onClick={resetForm} className="w-full sm:px-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* CATEGORY MANAGEMENT */}
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <Package className="text-blue-600 dark:text-blue-400" />
              Categories
            </h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Category..."
                  className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <button
                  onClick={handleCreateCategory}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-700">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex justify-between items-center py-3">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{cat.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ITEMS LIST */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 sm:px-8 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center transition-colors">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 transition-colors">
                <Package size={20} className="text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Product Catalog</span>
                <span className="sm:hidden">Catalog</span>
                {searchQuery && <span className="text-[10px] sm:text-xs font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full ml-1 transition-all truncate max-w-[100px]">{searchType === 'date' ? `Date: ${searchQuery}` : `"${searchQuery}"`}</span>}
              </h2>
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all">
                {filteredItems.length} <span className="hidden sm:inline">Products</span><span className="sm:hidden">Items</span>
              </span>
            </div>
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="p-10 sm:p-20 text-center border-t border-gray-100 dark:border-gray-700 transition-colors">
                    <CalendarX size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4 transition-colors" />
                    <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm transition-colors">{searchQuery ? 'No matching products found' : 'No products found'}</p>
                    {searchQuery && <p className="text-xs text-gray-400 mt-2 transition-colors">Try another {searchType === 'date' ? 'date' : 'search term'} or clear search</p>}
                </div>
              ) : (
                <table className="w-full relative border-collapse min-w-[600px] md:min-w-full">
                    <thead className="bg-gray-50/90 dark:bg-gray-900/90 transition-colors sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                        <th className="px-4 sm:px-8 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">Product Info</th>
                        <th className="px-4 sm:px-8 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700 bg-white dark:bg-gray-800 transition-colors">
                    {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                        <td className="px-4 sm:px-8 py-4">
                            <div className="font-bold text-gray-900 dark:text-white transition-colors text-sm sm:text-base">{item.name}</div>
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs mt-1 transition-colors">
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded font-bold uppercase transition-colors">{categories.find(c => c.id === item.category_id)?.name}</span>
                            </div>
                        </td>
                        <td className="px-4 sm:px-8 py-4">
                            <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEdit(item)} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                                <Edit size={14} className="sm:w-4 sm:h-4" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                                <Trash2 size={14} className="sm:w-4 sm:h-4" />
                            </button>
                            </div>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
    </>
  );
}
