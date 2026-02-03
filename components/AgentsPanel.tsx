/**
 * Agents Panel
 * Management interface for Chinese logistics agents
 */

import React, { useState, useEffect } from 'react';
import {
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentStats,
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentStats,
} from '../services/agents';

export function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<CreateAgentInput>({
    email: '',
    password: '',
    name: '',
    phone: '',
    company: '',
    contactName: '',
    wechatId: '',
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Load data on mount
  useEffect(() => {
    loadAgents();
    loadStats();
  }, [statusFilter, searchFilter]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (searchFilter) filters.search = searchFilter;

      const data = await getAgents(filters);
      setAgents(data);
    } catch (err: any) {
      setError(err.message || 'Eroare la încărcarea agenților');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getAgentStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingAgent) {
        const updateData: UpdateAgentInput = {
          company: formData.company,
          contactName: formData.contactName,
          wechatId: formData.wechatId || undefined,
          name: formData.name,
          phone: formData.phone || undefined,
        };
        await updateAgent(editingAgent.id, updateData);
        showMessage('Agentul a fost actualizat');
      } else {
        await createAgent(formData);
        showMessage('Agentul a fost creat');
      }

      setShowForm(false);
      setEditingAgent(null);
      resetForm();
      loadAgents();
      loadStats();
    } catch (err: any) {
      showMessage(err.message || 'Eroare la salvarea agentului', true);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      email: agent.user.email,
      password: '',
      name: agent.user.name,
      phone: agent.user.phone || '',
      company: agent.company,
      contactName: agent.contactName,
      wechatId: agent.wechatId || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Sigur doriți să dezactivați agentul ${agent.company}?`)) return;

    setLoading(true);
    try {
      await deleteAgent(agent.id);
      showMessage('Agentul a fost dezactivat');
      loadAgents();
      loadStats();
    } catch (err: any) {
      showMessage(err.message || 'Eroare la ștergerea agentului', true);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (agent: Agent, newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    setLoading(true);
    try {
      await updateAgent(agent.id, { status: newStatus });
      showMessage(`Statusul agentului a fost schimbat la ${newStatus}`);
      loadAgents();
      loadStats();
    } catch (err: any) {
      showMessage(err.message || 'Eroare la actualizarea statusului', true);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      company: '',
      contactName: '',
      wechatId: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Activ';
      case 'INACTIVE':
        return 'Inactiv';
      case 'SUSPENDED':
        return 'Suspendat';
      default:
        return status;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Agenți Chinezi</h1>
        <p className="mt-2 text-gray-600">
          Gestionați agenții de logistică din China
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Agenți</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Activi</div>
            <div className="mt-1 text-3xl font-semibold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Inactivi</div>
            <div className="mt-1 text-3xl font-semibold text-gray-500">{stats.inactive}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Suspendați</div>
            <div className="mt-1 text-3xl font-semibold text-red-600">{stats.suspended}</div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Caută agenți..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Toate statusurile</option>
            <option value="ACTIVE">Activ</option>
            <option value="INACTIVE">Inactiv</option>
            <option value="SUSPENDED">Suspendat</option>
          </select>
        </div>
        <button
          onClick={() => {
            setEditingAgent(null);
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Adaugă Agent
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingAgent ? 'Editare Agent' : 'Agent Nou'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={!!editingAgent}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>

                  {!editingAgent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parolă *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingAgent}
                        minLength={6}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nume Agent *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+86..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Companie *
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      required
                      placeholder="Numele companiei în China"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Persoană de Contact *
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      required
                      placeholder="Nume contact în China"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WeChat ID
                    </label>
                    <input
                      type="text"
                      value={formData.wechatId}
                      onChange={(e) => setFormData({ ...formData, wechatId: e.target.value })}
                      placeholder="ID WeChat pentru comunicare"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingAgent(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Se salvează...' : 'Salvează'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Agents Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cod</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Companie</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WeChat</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Prețuri</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rezervări</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && agents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Se încarcă...
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Nu există agenți. Adăugați primul agent.
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-blue-600">{agent.agentCode}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{agent.company}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{agent.contactName}</div>
                      <div className="text-xs text-gray-400">{agent.user.name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{agent.user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{agent.wechatId || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={agent.status}
                        onChange={(e) => handleStatusChange(agent, e.target.value as any)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${getStatusColor(agent.status)}`}
                      >
                        <option value="ACTIVE">Activ</option>
                        <option value="INACTIVE">Inactiv</option>
                        <option value="SUSPENDED">Suspendat</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">{agent.pricesCount}</td>
                    <td className="px-4 py-3 text-sm text-center">{agent.bookingsCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(agent)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Editează
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Dezactivează
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AgentsPanel;
