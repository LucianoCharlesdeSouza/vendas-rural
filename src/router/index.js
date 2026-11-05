import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import ClientesView from '../views/clientes/ClientesView.vue'
import ClienteFormView from '../views/clientes/ClienteFormView.vue'
import ClienteDetalheView from '../views/clientes/ClienteDetalheView.vue'
import ProdutosView from '../views/produtos/ProdutosView.vue'
import ProdutoFormView from '../views/produtos/ProdutoFormView.vue'
import NovaVendaView from '../views/vendas/NovaVendaView.vue'
import VendaPagamentoView from '../views/vendas/VendaPagamentoView.vue'
import PedidosView from '../views/pedidos/PedidosView.vue'
import PedidoFormView from '../views/pedidos/PedidoFormView.vue'
import PedidoDetalheView from '../views/pedidos/PedidoDetalheView.vue'
import ClienteHistoricoView from '../views/clientes/ClienteHistoricoView.vue'
import ReceberView from '../views/vendas/ReceberView.vue'
import ReceberClienteView from '../views/vendas/ReceberClienteView.vue'
import ProducaoView from '../views/relatorios/ProducaoView.vue'
import RelatoriosView from '../views/relatorios/RelatoriosView.vue'
import BackupView from '../views/sistema/BackupView.vue'
import RotaView from '../views/atendimento/RotaView.vue'
import RotaCriarView from '../views/atendimento/RotaCriarView.vue'
import AtenderClienteView from '../views/atendimento/AtenderClienteView.vue'



const router = createRouter({
  // history: createWebHashHistory(import.meta.env.BASE_URL),
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: { title: 'Vendas Rural' }
    },
    {
      path: '/clientes',
      name: 'clientes',
      component: ClientesView,
      meta: { title: 'Clientes' }
    },
    {
      path: '/cliente-form/:id?', // O '?' torna o ID opcional
      name: 'cliente-form',
      component: ClienteFormView,
      meta: { title: 'Novo Cliente' } // O App.vue vai ler isso
    },
    {
      path: '/cliente/:id',
      name: 'cliente-detalhe',
      component: ClienteDetalheView,
      meta: { title: 'Detalhes do Cliente' }
    },
    {
      path: '/produtos',
      name: 'produtos',
      component: ProdutosView,
      meta: { title: 'Produtos' }
    },
    {
      path: '/produto-form/:id?',
      name: 'produto-form',
      component: ProdutoFormView,
      meta: { title: 'Produto' }
    },

    {
      path: '/venda-nova',
      name: 'venda-nova',
      component: NovaVendaView,
      meta: { title: 'Nova Venda' }
    },
    {
      path: '/venda-pagamento',
      name: 'venda-pagamento',
      component: VendaPagamentoView,
      meta: { title: 'Pagamento' }
    },    
    {
      path: '/pedidos',
      name: 'pedidos',
      component: PedidosView,
      meta: { title: 'Pedidos' }
    },
    {
      path: '/pedido-form',
      name: 'pedido-form',
      component: PedidoFormView,
      meta: { title: 'Novo Pedido' }
    },
    {
      path: '/pedido/:id',
      name: 'pedido-detalhe',
      component: PedidoDetalheView,
      meta: { title: 'Pedido' }
    },
    
    { 
      path: '/cliente/:id/historico', 
      name: 'cliente-historico', 
      component: ClienteHistoricoView,
      meta: { title: 'Histórico' } },
    { 
      path: '/receber', 
      name: 'receber', 
      component: ReceberView,
      meta: { title: 'Recebimentos' }
    },
    { 
      path: '/receber/:id', 
      name: 'receber-cliente', 
      component: ReceberClienteView, 
      meta: { title: 'Receber' }
    },
    { 
      path: '/relatorios', 
      name: 'relatorios', 
      component: RelatoriosView, 
      meta: { title: 'Relatórios' }
    },
    { 
      path: '/producao', 
      name: 'producao', 
      component: ProducaoView, 
      meta: { title: 'Produção' }
    },
    { 
      path: '/backup', 
      name: 'backup', 
      component: BackupView, 
      meta: { title: 'Backup' } 
    },

   {
      path: '/rota',
      name: 'rota',
      component: RotaView,
      meta: { title: 'Rota de Hoje' }
    },
    {
      path: '/rota-criar',
      name: 'rota-criar',
      component: RotaCriarView,
      meta: { title: 'Criar Rota' }
    },    
    
    { 
      path: '/atender/:clienteId', 
      name: 'atender-cliente', 
      component: AtenderClienteView, 
      meta: { title: 'Atender Cliente' } 
    }    


  ],
})

export default router
