import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransbankService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  iniciarTransaccion(monto: number, sessionId: string, buyOrder: string, returnUrl: string) {
    const body = {
      amount: monto,
      sessionId,
      buyOrder,
      returnUrl
    };
    return this.http.post(`${this.apiUrl}/iniciar-transaccion`, body);
  }

  confirmarTransaccion(token: string) {
    const body = { token };
    return this.http.post(`${this.apiUrl}/confirmar-transaccion`, body);
  }

  verificarEstado(token: string): Observable<any> {
    const body = { token };
    return this.http.post(`${this.apiUrl}/verificar-estado`, body);
  }

  hacerTransaccion(monto: number) {
    const sessionId = 'SESSION12345';
    const buyOrder = 'ORDER12345';
    const returnUrl = 'http://localhost:8100/';

    this.iniciarTransaccion(monto, sessionId, buyOrder, returnUrl).subscribe(
      (response: any) => {
        console.log('Response from server:', response);
        // Redirige al usuario a la URL de pago proporcionada por Transbank
        if (response.url && response.token) {
          window.location.href = response.url + '?token_ws=' + response.token;
        }
      },
      (error: any) => {
        console.error('Error in iniciarTransaccion:', error);
      }
    );
  }

}