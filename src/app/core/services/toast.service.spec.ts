import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    jasmine.clock().install();
    service = new ToastService();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('show ajoute et retire le toast après la durée', () => {
    service.show('success', 'ok', 1000);
    expect(service.toasts().length).toBe(1);
    const id = service.toasts()[0].id;

    jasmine.clock().tick(999);
    expect(service.toasts().length).toBe(1);

    jasmine.clock().tick(2);
    expect(service.toasts().find(t => t.id === id)).toBeUndefined();
  });

  it('helpers success/error/warning/info délèguent à show', () => {
    spyOn<any>(service, 'show').and.callThrough();
    service.success('a');
    service.error('b');
    service.warning('c');
    service.info('d');
    expect((service as any).show).toHaveBeenCalledTimes(4);
  });
});